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
let admin: string;
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
  await fixture.client
    .query(`UPDATE "better-auth"."user" SET status='active' WHERE role='Administrator';
    INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at)
    SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a
    WHERE a.provider_id='credential' AND u.id::text<>a.user_id`);
  await fixture.client.query(
    readFileSync('tests/support/ready-identities.sql', 'utf8'),
  );
  app = await startApplication(fixture.url);
  admin = await signIn(app.baseURL, 'admin@example.invalid');
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
});
const position = <T = any>(action: string, data?: unknown, cookie = admin) =>
  operation<T>(
    app.baseURL,
    'calendar',
    'positionServerFns',
    action,
    data,
    cookie,
  );
const userId = '01930000-0000-7000-8000-000000000001';
const root = '01930000-0000-7000-8000-000000000111';
const child = '01930000-0000-7000-8000-000000000112';
const certification = (id: string, match = 'exact') => ({
  type: 'certification',
  certificationId: id,
  match,
});
const expression = {
  version: 1,
  root: {
    type: 'or',
    children: [
      certification(root),
      {
        type: 'and',
        children: [
          certification(child),
          { type: 'minimum-role', role: 'Officer' },
        ],
      },
    ],
  },
};
async function createPosition(
  name: string,
  eligibilityExpression: unknown = null,
) {
  const result = await position('create', {
    name,
    display: name,
    description: null,
    eligibilityExpression,
  });
  expect(result).toMatchObject({ ok: true });
  return result.value.id as string;
}

test('a scheduler authors a global nested expression and reads it back unchanged', async () => {
  const id = await createPosition('Nested requirements', expression);
  expect(await position('byId', { positionId: id })).toMatchObject({
    ok: true,
    value: { eligibilityExpression: expression },
  });
});

test('verified descendant matching and minimum roles preserve nested alternatives', async () => {
  const id = await createPosition('Evaluate branches', expression);
  const evaluate = () => position('eligibility', { positionId: id, userId });
  expect(await evaluate()).toMatchObject({
    ok: true,
    value: {
      eligible: false,
      requirementsMet: false,
      explanation: {
        type: 'or',
        met: false,
        children: [
          { type: 'certification', met: false },
          { type: 'and', met: false },
        ],
      },
    },
  });
  await fixture.client.query(
    `INSERT INTO authz.user_certifications(user_id,certification_id,status) VALUES ($1,$2,'verified')`,
    [userId, child],
  );
  expect(await evaluate()).toMatchObject({
    ok: true,
    value: { eligible: false },
  });
  await position('update', {
    positionId: id,
    data: {
      eligibilityExpression: {
        version: 1,
        root: certification(root, 'descendants'),
      },
    },
  });
  expect(await evaluate()).toMatchObject({
    ok: true,
    value: { eligible: true, explanation: { met: true } },
  });
});

test('unsupported language and deleted or missing references are rejected server-side', async () => {
  for (const root of [
    { type: 'not', child: certification(child) },
    { type: 'exact-role', role: 'Officer' },
    { type: 'user-type', userTypeId: child },
    { type: 'and', children: [] },
    { type: 'minimum-role', role: 'Owner' },
    { ...certification(child), status: 'pending' },
    certification('01930000-0000-7000-8000-000000000999'),
  ])
    expect(
      await position('create', {
        name: 'Invalid',
        display: 'Invalid',
        description: null,
        eligibilityExpression: { version: 1, root },
      }),
    ).toMatchObject({ ok: false });
  const protectedId = '01930000-0000-7000-8000-000000000113';
  await fixture.client.query(
    `INSERT INTO authz.certifications (id,name,display) VALUES ($1,'Protected','Protected')`,
    [protectedId],
  );
  const id = await createPosition('Protected catalog', {
    version: 1,
    root: certification(protectedId),
  });
  const deleted = await operation(
    app.baseURL,
    'users',
    'certificationServerFns',
    'remove',
    { certificationId: protectedId },
    admin,
  );
  expect(deleted).toMatchObject({
    ok: false,
    error: expect.stringContaining('position requirements'),
  });
  expect(
    await position('update', {
      positionId: id,
      data: { eligibilityExpression: null },
    }),
  ).toMatchObject({ ok: true });
});

test('minimum role inheritance does not grant authority and empty requirements still enforce assignability', async () => {
  const volunteer = await signIn(app.baseURL, 'user@example.invalid');
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  const officerId = '01930000-0000-7000-8000-000000000002';
  const developerId = '01930000-0000-7000-8000-000000000004';
  const invitedId = '01930000-0000-7000-8000-000000000005';
  const id = await createPosition('Role threshold', {
    version: 1,
    root: { type: 'minimum-role', role: 'Officer' },
  });
  expect(
    await position('eligibility', { positionId: id, userId: officerId }),
  ).toMatchObject({ ok: true, value: { eligible: true } });
  expect(
    await position('eligibility', { positionId: id, userId: developerId }),
  ).toMatchObject({ ok: true, value: { eligible: true } });
  expect(
    await position('eligibility', { positionId: id, userId }, volunteer),
  ).toMatchObject({ ok: true, value: { eligible: false } });
  expect(
    await position(
      'eligibility',
      { positionId: id, userId: officerId },
      volunteer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await position(
      'update',
      { positionId: id, data: { eligibilityExpression: null } },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await position(
      'create',
      { name: 'Unauthorized', display: 'Unauthorized', description: null },
      volunteer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  await position('update', {
    positionId: id,
    data: { eligibilityExpression: null },
  });
  expect(
    await position('eligibility', { positionId: id, userId }, volunteer),
  ).toMatchObject({
    ok: true,
    value: { eligible: true, requirementsMet: true, explanation: null },
  });
  expect(
    await position('eligibility', { positionId: id, userId: invitedId }),
  ).toMatchObject({ ok: true, value: { eligible: true, assignable: true } });
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET status='inactive' WHERE id=$1`,
    [invitedId],
  );
  expect(
    await position('eligibility', { positionId: id, userId: invitedId }),
  ).toMatchObject({
    ok: true,
    value: { eligible: false, assignable: false, requirementsMet: true },
  });
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET status='active',timestamp_onboarding_completed=NULL WHERE id=$1`,
    [invitedId],
  );
  expect(
    await position('eligibility', { positionId: id, userId: invitedId }),
  ).toMatchObject({ ok: true, value: { eligible: false } });
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET can_manage_scheduling=true WHERE id=$1`,
    [officerId],
  );
  expect(
    await position(
      'update',
      {
        positionId: id,
        data: {
          eligibilityExpression: {
            version: 1,
            root: { type: 'minimum-role', role: 'User' },
          },
        },
      },
      officer,
    ),
  ).toMatchObject({ ok: true });
});

test('only live verified certifications qualify, independently of user type', async () => {
  const certId = '01930000-0000-7000-8000-000000000114';
  await fixture.client.query(
    `INSERT INTO authz.certifications(id,name,display) VALUES ($1,'Review statuses','Review statuses')`,
    [certId],
  );
  const id = await createPosition('Verified only', {
    version: 1,
    root: certification(certId),
  });
  const check = () => position('eligibility', { positionId: id, userId });
  for (const status of ['pending', 'rejected']) {
    await fixture.client.query(
      `INSERT INTO authz.user_certifications(user_id,certification_id,status) VALUES ($1,$2,$3) ON CONFLICT(user_id,certification_id) WHERE deleted_at IS NULL DO UPDATE SET status=EXCLUDED.status`,
      [userId, certId, status],
    );
    expect(await check()).toMatchObject({
      ok: true,
      value: { eligible: false },
    });
  }
  await fixture.client.query(
    `UPDATE authz.user_certifications SET status='verified' WHERE user_id=$1 AND certification_id=$2`,
    [userId, certId],
  );
  expect(await check()).toMatchObject({ ok: true, value: { eligible: true } });
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET user_type_id=NULL WHERE id=$1`,
    [userId],
  );
  expect(await check()).toMatchObject({ ok: true, value: { eligible: true } });
  await fixture.client.query(
    `UPDATE authz.user_certifications SET deleted_at=now() WHERE user_id=$1 AND certification_id=$2`,
    [userId, certId],
  );
  expect(await check()).toMatchObject({ ok: true, value: { eligible: false } });
});

test('ordinary volunteers see branch explanations on a position page without editing controls', async () => {
  const id = await createPosition('Visible alternatives', expression);
  const volunteer = await signIn(app.baseURL, 'user@example.invalid');
  const page = await fetch(`${app.baseURL}/admin/positions/${id}`, {
    headers: { cookie: volunteer },
  });
  const html = await page.text();
  expect(page.status).toBe(200);
  expect(html).toContain('At least one of these');
  expect(html).toContain('All of these');
  expect(html).toContain('Officer or higher');
  expect(html).not.toContain('Edit requirements</button>');
  const adminPage = await fetch(`${app.baseURL}/admin/positions/${id}`, {
    headers: { cookie: admin },
  });
  expect(await adminPage.text()).toContain('Edit requirements');
});

test('editing a global position keeps current assignments and inbox state unchanged', async () => {
  const positionId = '01930000-0000-7000-8000-000000000201';
  const eventId = '01930000-0000-7000-8000-000000000301';
  const slots = () =>
    operation(
      app.baseURL,
      'calendar',
      'slotServerFns',
      'byEventId',
      { eventId },
      admin,
    );
  const inbox = () =>
    operation(
      app.baseURL,
      'inbox',
      'inboxServerFns',
      'list',
      { history: true },
      admin,
    );
  const beforeSlots = await slots();
  const beforeInbox = await inbox();
  expect(beforeSlots.ok).toBe(true);
  expect(beforeInbox.ok).toBe(true);
  expect(
    await position('update', {
      positionId,
      data: {
        eligibilityExpression: {
          version: 1,
          root: { type: 'minimum-role', role: 'Developer' },
        },
      },
    }),
  ).toMatchObject({ ok: true });
  expect(await slots()).toEqual(beforeSlots);
  expect(await inbox()).toEqual(beforeInbox);
  const page = await fetch(`${app.baseURL}/calendar/events/${eventId}`, {
    headers: { cookie: admin },
  });
  const html = await page.text();
  expect(html).toContain(`/admin/positions/${positionId}`);
  expect(html).toContain('View requirements');
});

test('one complete nested alternative is sufficient even when the other branch is unmet', async () => {
  const officerId = '01930000-0000-7000-8000-000000000002';
  await fixture.client.query(
    `INSERT INTO authz.user_certifications(user_id,certification_id,status) VALUES ($1,$2,'verified')`,
    [officerId, child],
  );
  const id = await createPosition('Successful alternative', expression);
  expect(
    await position('eligibility', { positionId: id, userId: officerId }),
  ).toMatchObject({
    ok: true,
    value: {
      eligible: true,
      explanation: {
        type: 'or',
        met: true,
        children: [
          { met: false },
          { type: 'and', met: true, children: [{ met: true }, { met: true }] },
        ],
      },
    },
  });
});
