import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let fixture: Awaited<ReturnType<typeof cluster.database>>;
let app: Awaited<ReturnType<typeof startApplication>>;
let volunteer: string, admin: string, developer: string;
const userId = '01930000-0000-7000-8000-000000000001';
const certId = '01930000-0000-7000-8000-000000000112';
beforeAll(async () => {
  cluster = await startPostgres();
  fixture = await cluster.database();
  await promisify(execFile)(
    process.execPath,
    ['--import', 'tsx', 'scripts/db/migrate.ts', '--apply'],
    { env: { ...process.env, MIGRATION_DATABASE_URL: fixture.url } },
  );
  await fixture.client.query(
    readFileSync('tests/support/retained.sql', 'utf8'),
  );
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET status='active' WHERE role='Administrator'; INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at) SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a WHERE a.provider_id='credential' AND u.id::text<>a.user_id`,
  );
  await fixture.client.query(
    readFileSync('tests/support/ready-identities.sql', 'utf8'),
  );
  app = await startApplication(fixture.url);
  volunteer = await signIn(app.baseURL, 'user@example.invalid');
  admin = await signIn(app.baseURL, 'admin@example.invalid');
  developer = await signIn(app.baseURL, 'developer@example.invalid');
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
});
type Link = {
  id: string;
  userId: string;
  certificationId: string;
  display: string;
  status: 'pending' | 'verified' | 'rejected';
  version: number;
};
type Notice = {
  id: string;
  kind: string;
  body: string;
  userCertificationId: string;
  certificationDisplay: string;
  version: number;
  readAt: string | null;
  dismissedAt: string | null;
  resolvedAt: string | null;
};
const links = <T = unknown>(
  action: string,
  data?: unknown,
  cookie = volunteer,
) =>
  operation<T>(
    app.baseURL,
    'user-certifications',
    'userCertificationServerFns',
    action,
    data,
    cookie,
  );
const inbox = (cookie = admin, history = false) =>
  operation<Notice[]>(
    app.baseURL,
    'inbox',
    'inboxServerFns',
    'list',
    { history },
    cookie,
  );

test('volunteer submission is pending and appears in the same shared review queue for every user manager', async () => {
  const created = await links<{ id: string }>('create', {
    userId,
    certificationId: certId,
  });
  expect(created).toMatchObject({ ok: true });
  expect(await links('list', { userId })).toMatchObject({
    ok: true,
    value: [
      {
        id: created.value!.id,
        certificationId: certId,
        status: 'pending',
        version: 1,
      },
    ],
  });
  const first = await inbox(admin);
  const second = await inbox(developer);
  expect(first).toMatchObject({
    ok: true,
    value: [
      {
        kind: 'certification-review',
        userCertificationId: created.value!.id,
        certificationDisplay: 'Child',
        readAt: null,
        dismissedAt: null,
        resolvedAt: null,
      },
    ],
  });
  expect(second.value?.[0].id).toBe(first.value?.[0].id);
}, 30000);

let sequence = 0;
async function submit() {
  const created = await operation<{ id: string }>(
    app.baseURL,
    'users',
    'certificationServerFns',
    'create',
    {
      name: `Review ${++sequence}`,
      display: `Qualification ${sequence}`,
      parent: null,
    },
    admin,
  );
  expect(created).toMatchObject({ ok: true });
  const result = await links<{ id: string }>('create', {
    userId,
    certificationId: created.value!.id,
  });
  expect(result).toMatchObject({ ok: true });
  const rows = await links<Link[]>('list', { userId });
  return rows.value!.find((row) => row.id === result.value!.id)!;
}
async function noticeFor(id: string, cookie = admin, history = false) {
  return (await inbox(cookie, history)).value!.find(
    (notice) => notice.userCertificationId === id,
  )!;
}

test('read and dismissal are personal, while approval closes review globally without approval messages', async () => {
  const link = await submit();
  const item = await noticeFor(link.id);
  expect(
    await operation(
      app.baseURL,
      'inbox',
      'inboxServerFns',
      'setState',
      { notificationId: item.id, state: 'read' },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect((await noticeFor(link.id, admin)).readAt).toEqual(expect.any(String));
  expect((await noticeFor(link.id, developer)).readAt).toBeNull();
  expect(
    await operation(
      app.baseURL,
      'inbox',
      'inboxServerFns',
      'setState',
      { notificationId: item.id, state: 'dismiss' },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(await noticeFor(link.id, admin)).toBeUndefined();
  expect(await noticeFor(link.id, developer)).toMatchObject({ id: item.id });
  const before = (await inbox(volunteer, true)).value!;
  expect(
    await links(
      'review',
      { id: link.id, version: link.version, decision: 'approve' },
      developer,
    ),
  ).toMatchObject({ ok: true });
  expect(await noticeFor(link.id, developer)).toBeUndefined();
  expect(await noticeFor(link.id, admin, true)).toMatchObject({
    id: item.id,
    resolvedAt: expect.any(String),
    dismissedAt: expect.any(String),
  });
  expect((await inbox(volunteer, true)).value).toEqual(before);
  expect(await links('list', { userId })).toMatchObject({
    ok: true,
    value: expect.arrayContaining([
      { ...link, status: 'verified', version: 2 },
    ]),
  });
}, 30000);

test('pending edits keep one current review item, rejection delivers a copied comment, and resubmission keeps relation identity', async () => {
  const link = await submit();
  const item = await noticeFor(link.id);
  const replacement = await operation<{ id: string }>(
    app.baseURL,
    'users',
    'certificationServerFns',
    'create',
    {
      name: `Replacement ${++sequence}`,
      display: 'Updated qualification',
      parent: null,
    },
    admin,
  );
  expect(
    await links('edit', {
      id: link.id,
      version: 1,
      certificationId: replacement.value!.id,
    }),
  ).toMatchObject({ ok: true, value: { id: link.id } });
  const updated = await noticeFor(link.id);
  expect(updated).toMatchObject({
    id: item.id,
    body: item.body,
    certificationDisplay: 'Updated qualification',
    version: 2,
  });
  expect(
    await links(
      'review',
      {
        id: link.id,
        version: 2,
        decision: 'reject',
        comment: 'Please provide the correct qualification.',
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(await noticeFor(link.id)).toBeUndefined();
  const delivered = (await inbox(volunteer)).value!.find(
    (notice) => notice.userCertificationId === link.id,
  )!;
  expect(delivered.body).toBe(
    'Your Updated qualification certification was rejected. Please provide the correct qualification.',
  );
  expect(
    await links('edit', {
      id: link.id,
      version: 3,
      certificationId: link.certificationId,
    }),
  ).toMatchObject({ ok: true });
  const reopened = await noticeFor(link.id);
  expect(reopened.id).not.toBe(item.id);
  expect(reopened).toMatchObject({
    userCertificationId: link.id,
    certificationDisplay: link.display,
    version: 4,
  });
  expect(
    await links(
      'review',
      {
        id: link.id,
        version: 4,
        decision: 'reject',
        comment: 'A different decision comment.',
      },
      developer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    (await inbox(volunteer, true)).value!.find(
      (notice) => notice.id === delivered.id,
    )?.body,
  ).toBe(delivered.body);
  expect(await links('list', { userId })).toMatchObject({
    ok: true,
    value: expect.arrayContaining([
      expect.objectContaining({ id: link.id, status: 'rejected', version: 5 }),
    ]),
  });
}, 30000);

test('own pending withdrawal closes the review globally; a manager-created qualification is verified and only a manager may remove it', async () => {
  const link = await submit();
  expect(await links('remove', { id: link.id, version: 1 })).toMatchObject({
    ok: true,
  });
  expect(await noticeFor(link.id, admin)).toBeUndefined();
  expect(await noticeFor(link.id, developer)).toBeUndefined();
  expect(
    (await links<Link[]>('list', { userId })).value!.some(
      (record) => record.id === link.id,
    ),
  ).toBe(false);
  const before = (await inbox(volunteer, true)).value!;
  const created = await links<{ id: string }>(
    'create',
    { userId, certificationId: link.certificationId },
    admin,
  );
  expect(created).toMatchObject({ ok: true });
  const record = (await links<Link[]>('list', { userId })).value!.find(
    (record) => record.id === created.value!.id,
  )!;
  expect(record.status).toBe('verified');
  expect(await noticeFor(record.id)).toBeUndefined();
  expect(
    await links('remove', { id: record.id, version: record.version }),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await links('remove', { id: record.id, version: record.version }, admin),
  ).toMatchObject({ ok: true });
  expect((await inbox(volunteer, true)).value).toEqual(before);
}, 30000);

test('live user-certification links block catalog deletion while deleted links retain history without blocking', async () => {
  const link = await submit();
  expect(
    await operation(
      app.baseURL,
      'users',
      'certificationServerFns',
      'remove',
      { certificationId: link.certificationId },
      admin,
    ),
  ).toMatchObject({
    ok: false,
    error: 'Certification has non-deleted user records',
  });
  expect(await links('remove', { id: link.id, version: 1 })).toMatchObject({
    ok: true,
  });
  expect(
    await operation(
      app.baseURL,
      'users',
      'certificationServerFns',
      'remove',
      { certificationId: link.certificationId },
      admin,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('full-profile viewing does not grant review authority and current grants control shared inbox visibility', async () => {
  const link = await submit();
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  expect(await links('list', { userId }, officer)).toMatchObject({ ok: true });
  expect(
    (await inbox(officer)).value?.some(
      (item) => item.kind === 'certification-review',
    ),
  ).toBe(false);
  expect(
    await links(
      'review',
      { id: link.id, version: 1, decision: 'approve' },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await links('create', { userId, certificationId: certId }, officer),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  const item = await noticeFor(link.id);
  expect(
    await operation(
      app.baseURL,
      'inbox',
      'inboxServerFns',
      'setState',
      { notificationId: item.id, state: 'dismiss' },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId: '01930000-0000-7000-8000-000000000002', canManageUsers: true },
      admin,
    ),
  ).toMatchObject({ ok: true });
  try {
    expect(await noticeFor(link.id, officer)).toMatchObject({
      id: item.id,
      readAt: null,
      dismissedAt: null,
    });
  } finally {
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId: '01930000-0000-7000-8000-000000000002', canManageUsers: false },
      admin,
    );
  }
  expect(await noticeFor(link.id, officer)).toBeUndefined();
}, 30000);

test("volunteers cannot review, mutate another profile, forge verification, or change someone else's personal delivery state", async () => {
  const link = await submit();
  expect(
    await links('list', { userId: '01930000-0000-7000-8000-000000000002' }),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await links('create', {
      userId: '01930000-0000-7000-8000-000000000002',
      certificationId: link.certificationId,
    }),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await links('review', { id: link.id, version: 1, decision: 'approve' }),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await links('edit', {
      id: link.id,
      version: 1,
      certificationId: link.certificationId,
      status: 'verified',
    }),
  ).toMatchObject({ ok: false });
  expect(
    await links('create', {
      userId,
      certificationId: link.certificationId,
      actorId: 'admin',
      role: 'Administrator',
    }),
  ).toMatchObject({ ok: false });
  expect(
    await links(
      'review',
      {
        id: link.id,
        version: 1,
        decision: 'reject',
        comment: 'Private delivered comment',
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  const personal = (await inbox(volunteer)).value!.find(
    (item) => item.userCertificationId === link.id,
  )!;
  expect(
    await operation(
      app.baseURL,
      'inbox',
      'inboxServerFns',
      'setState',
      { notificationId: personal.id, state: 'read' },
      developer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    (await inbox(developer, true)).value?.some(
      (item) => item.id === personal.id,
    ),
  ).toBe(false);
  expect(
    (await inbox(volunteer)).value!.find((item) => item.id === personal.id)
      ?.readAt,
  ).toBeNull();
}, 30000);

test('stale review versions cannot approve an edited submission or send duplicate rejection messages', async () => {
  const link = await submit();
  expect(
    await links('edit', {
      id: link.id,
      version: 1,
      certificationId: link.certificationId,
    }),
  ).toMatchObject({ ok: true });
  expect(
    await links(
      'review',
      { id: link.id, version: 1, decision: 'approve' },
      admin,
    ),
  ).toMatchObject({
    ok: false,
    error: 'Submission changed; refresh before trying again',
  });
  expect(
    await links(
      'review',
      { id: link.id, version: 2, decision: 'reject' },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await links(
      'review',
      { id: link.id, version: 2, decision: 'reject', comment: 'Duplicate' },
      developer,
    ),
  ).toMatchObject({
    ok: false,
    error: 'Submission changed; refresh before trying again',
  });
  expect(
    (await inbox(volunteer, true)).value!.filter(
      (item) => item.userCertificationId === link.id,
    ),
  ).toHaveLength(1);
}, 30000);

test('profiles and inbox show the permitted controls and delivered text', async () => {
  const link = await submit();
  const ownerPage = await (
    await fetch(`${app.baseURL}/admin/users/${userId}/profile`, {
      headers: { cookie: volunteer },
    })
  ).text();
  expect(ownerPage).toContain('Submit certification');
  expect(ownerPage).toContain(link.display);
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  const viewedPage = await (
    await fetch(`${app.baseURL}/admin/users/${userId}/profile`, {
      headers: { cookie: officer },
    })
  ).text();
  expect(viewedPage).toContain(link.display);
  expect(viewedPage).not.toContain('Submit certification');
  expect(viewedPage).not.toContain('Withdraw submission');
  expect(viewedPage).not.toContain('Add verified certification');
  const reviewerPage = await (
    await fetch(`${app.baseURL}/inbox`, { headers: { cookie: admin } })
  ).text();
  expect(reviewerPage).toContain('Approve certification');
  expect(reviewerPage).toContain(link.display);
  const ordinaryPage = await (
    await fetch(`${app.baseURL}/inbox`, { headers: { cookie: volunteer } })
  ).text();
  expect(ordinaryPage).not.toContain('Approve certification');
  expect(ordinaryPage).toContain('Private delivered comment');
}, 30000);

test('renaming the catalog changes current profile labels without rewriting delivered outcomes', async () => {
  const link = await submit();
  expect(
    await links(
      'review',
      {
        id: link.id,
        version: 1,
        decision: 'reject',
        comment: 'Keep this delivered wording.',
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  const delivered = (await inbox(volunteer)).value!.find(
    (item) => item.userCertificationId === link.id,
  )!;
  expect(
    await operation(
      app.baseURL,
      'users',
      'certificationServerFns',
      'update',
      {
        certificationId: link.certificationId,
        data: { display: 'Renamed current qualification' },
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    (await links<Link[]>('list', { userId })).value!.find(
      (item) => item.id === link.id,
    )?.display,
  ).toBe('Renamed current qualification');
  expect(
    (await inbox(volunteer, true)).value!.find(
      (item) => item.id === delivered.id,
    )?.body,
  ).toBe(delivered.body);
}, 30000);
