import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let fixture: Awaited<ReturnType<typeof cluster.database>>;
let app: Awaited<ReturnType<typeof startApplication>>;
const userId = '01930000-0000-7000-8000-000000000001';
beforeAll(async () => {
  cluster = await startPostgres();
  fixture = await cluster.database();
  await promisify(execFile)(
    process.execPath,
    ['--import', 'tsx', 'scripts/db/migrate.ts', '--apply'],
    {
      env: { ...process.env, MIGRATION_DATABASE_URL: fixture.url },
    },
  );
  await fixture.client.query(
    readFileSync('tests/support/retained.sql', 'utf8'),
  );
  await fixture.client
    .query(`UPDATE "better-auth"."user" SET status='active' WHERE role='Administrator';
    INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at)
    SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a
    WHERE a.provider_id='credential' AND u.id::text<>a.user_id`);
  await fixture.client.query(readFileSync('tests/support/ready-identities.sql', 'utf8'));
  app = await startApplication(fixture.url);
}, 30000);

beforeEach(async () => {
  await fixture.client
    .query(`UPDATE "better-auth"."user" SET display='Fixture User',name_first='Fixture',name_middle=NULL,name_last='User',phone_number='+15550100100',post_nominals='MD',image=NULL,user_type_id='01930000-0000-7000-8000-000000000101' WHERE email='user@example.invalid';
    UPDATE "better-auth"."user" SET can_manage_users=false,can_manage_scheduling=false WHERE role='Officer'; UPDATE "better-auth"."user" SET deleted_at=NULL,user_type_id=NULL WHERE status='invited'`);
});

test('a user manager updates permitted profile fields and the profile reads the current values', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      {
        userId: '01930000-0000-7000-8000-000000000002',
        canManageUsers: true,
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  const changes = {
    nameFirst: ' Alice ',
    nameMiddle: ' Q ',
    nameLast: ' Example ',
    phoneNumber: '+1 (555) 010-0200',
    postNominals: 'RN',
    image: null,
  };
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateProfile',
      { userId, data: changes },
      officer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId },
      officer,
    ),
  ).toMatchObject({
    ok: true,
    value: {
      display: 'Alice Q Example',
      nameFirst: 'Alice',
      nameMiddle: 'Q',
      nameLast: 'Example',
      phoneNumber: '+15550100200',
      postNominals: 'RN',
      image: null,
      role: 'User',
      userTypeDisplay: 'Volunteer',
      canManageScheduling: false,
      canManageUsers: false,
    },
  });
  const page = await (
    await fetch(`${app.baseURL}/admin/users/${userId}/profile`, {
      headers: { cookie: officer },
    })
  ).text();
  expect(page).toContain('Alice Q Example');
  expect(page).toContain('href="tel:+15550100200"');
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
});

test('an Officer without grants sees the full current profile and contact information', async () => {
  const cookie = await signIn(app.baseURL, 'officer@example.invalid');
  const response = await fetch(`${app.baseURL}/admin/users/${userId}/profile`, {
    headers: { cookie },
  });
  expect(response.status).toBe(200);
  const page = await response.text();
  expect(page).toContain('href="mailto:user@example.invalid"');
  expect(page).toContain('href="tel:+15550100100"');
  expect(page).toContain('MD');
  expect(page).toContain('Volunteer');
  expect(page).not.toContain('Edit profile');
  expect(page).not.toContain('Assign user type');
}, 30000);

test.each(['user@example.invalid', 'officer@example.invalid'])(
  '%s cannot mutate another profile or manage user types',
  async (email) => {
    const cookie = await signIn(app.baseURL, email);
    const target = email.startsWith('user@')
      ? '01930000-0000-7000-8000-000000000002'
      : userId;
    const data = {
      nameFirst: 'Denied',
      nameMiddle: null,
      nameLast: 'Edit',
      phoneNumber: null,
      postNominals: null,
      image: null,
    };
    expect(
      await operation(
        app.baseURL,
        'users',
        'userServerFns',
        'updateProfile',
        { userId: target, data },
        cookie,
      ),
    ).toMatchObject({ ok: false, error: 'Forbidden' });
    for (const [action, input] of [
      ['create', { display: 'Denied type' }],
      [
        'rename',
        {
          userTypeId: '01930000-0000-7000-8000-000000000101',
          display: 'Denied rename',
        },
      ],
      ['remove', { userTypeId: '01930000-0000-7000-8000-000000000101' }],
    ] as const)
      expect(
        await operation(
          app.baseURL,
          'authz',
          'userTypeServerFns',
          action,
          input,
          cookie,
        ),
      ).toMatchObject({ ok: false, error: 'Forbidden' });
    if (email.startsWith('user@'))
      expect(
        await operation(
          app.baseURL,
          'users',
          'userServerFns',
          'byId',
          { userId: target },
          cookie,
        ),
      ).toMatchObject({ ok: false, error: 'Forbidden' });
  },
  30000,
);

test('scheduling alone cannot edit profiles or create labels; inactive managers cannot mutate either', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  await operation(
    app.baseURL,
    'users',
    'userServerFns',
    'updateCapabilities',
    {
      userId: '01930000-0000-7000-8000-000000000002',
      canManageScheduling: true,
    },
    admin,
  );
  expect(
    await operation(
      app.baseURL,
      'authz',
      'userTypeServerFns',
      'create',
      { display: 'No scheduling label' },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET status='inactive' WHERE role='Administrator'`,
  );
  try {
    expect(
      await operation(
        app.baseURL,
        'authz',
        'userTypeServerFns',
        'create',
        { display: 'No inactive label' },
        admin,
      ),
    ).toMatchObject({ ok: false, error: 'Forbidden' });
  } finally {
    await fixture.client.query(
      `UPDATE "better-auth"."user" SET status='active' WHERE role='Administrator'`,
    );
  }
}, 30000);

test('profile writes reject protected fields and invalid contact values while own basic editing remains permitted', async () => {
  const cookie = await signIn(app.baseURL, 'user@example.invalid');
  const data = {
    nameFirst: 'Own',
    nameMiddle: null,
    nameLast: 'Profile',
    phoneNumber: '+44 20 7946 0958',
    postNominals: null,
    image: null,
  };
  for (const extra of [
    { role: 'Developer' },
    { display: 'Forged' },
    { email: 'other@example.invalid' },
    { userTypeId: null },
    { status: 'active' },
    { canManageUsers: true },
    { deletedAt: null },
    { emailVerified: true },
    { nameFirst: ' ' },
    { phoneNumber: '555 010 0200' },
  ]) {
    expect(
      await operation(
        app.baseURL,
        'users',
        'userServerFns',
        'updateProfile',
        { userId, data: { ...data, ...extra } },
        cookie,
      ),
    ).toMatchObject({ ok: false });
  }
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateProfile',
      { userId, data },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId },
      cookie,
    ),
  ).toMatchObject({
    ok: true,
    value: {
      display: 'Own Profile',
      phoneNumber: '+442079460958',
      email: 'user@example.invalid',
      role: 'User',
    },
  });
}, 30000);

test('staffing selection stays minimal and deleted profiles disappear from normal views', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const deleted = '01930000-0000-7000-8000-000000000005';
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET deleted_at=clock_timestamp() WHERE id=$1`,
    [deleted],
  );
  const result = await operation<Record<string, unknown>[]>(
    app.baseURL,
    'users',
    'userServerFns',
    'allForCombobox',
    undefined,
    admin,
  );
  expect(result.ok).toBe(true);
  expect(result.value!.some((profile) => profile.id === deleted)).toBe(false);
  expect(Object.keys(result.value![0]).sort()).toEqual([
    'display',
    'id',
    'nameFirst',
    'nameLast',
    'role',
    'userTypeId',
  ]);
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId: deleted },
      admin,
    ),
  ).toMatchObject({ ok: false, error: 'Profile not found' });
}, 30000);

test('authentication-plugin profile reads cannot bypass retained-profile visibility', async () => {
  const cookie = await signIn(app.baseURL, 'officer@example.invalid');
  const deleted = '01930000-0000-7000-8000-000000000005';
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET deleted_at=clock_timestamp() WHERE id=$1`,
    [deleted],
  );
  for (const path of [`get-user?id=${deleted}`, 'list-users']) {
    const response = await fetch(`${app.baseURL}/api/auth/admin/${path}`, {
      headers: { cookie },
    });
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('invite@example.invalid');
  }
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId },
      cookie,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test.each([
  ['officer@example.invalid', false],
  ['admin@example.invalid', true],
  ['developer@example.invalid', true],
] as const)(
  '%s sees permitted user type management controls',
  async (email, editable) => {
    const cookie = await signIn(app.baseURL, email);
    const response = await fetch(`${app.baseURL}/admin/user-types`, {
      headers: { cookie },
    });
    expect(response.status).toBe(200);
    const page = await response.text();
    expect(page).toContain('Volunteer');
    expect(page.includes('Create user type')).toBe(editable);
  },
  30000,
);

test('a user manager creates, assigns and renames a reusable label without granting platform permissions', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const created = await operation<{ id: string }>(
    app.baseURL,
    'authz',
    'userTypeServerFns',
    'create',
    { display: 'Coordinator' },
    admin,
  );
  expect(created).toMatchObject({
    ok: true,
    value: { id: expect.any(String) },
  });
  expect(
    await operation(
      app.baseURL,
      'authz',
      'userTypeServerFns',
      'create',
      { display: 'coordinator' },
      admin,
    ),
  ).toMatchObject({
    ok: false,
    error: 'A user type with this name already exists',
  });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateUserType',
      { userId, userTypeId: created.value!.id },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'authz',
      'userTypeServerFns',
      'rename',
      { userTypeId: created.value!.id, display: 'Developer' },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId },
      admin,
    ),
  ).toMatchObject({
    ok: true,
    value: {
      userTypeDisplay: 'Developer',
      role: 'User',
      canManageScheduling: false,
      canManageUsers: false,
    },
  });
  const cookie = await signIn(app.baseURL, 'user@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      { name: 'denied-by-label', display: 'Denied', description: null },
      cookie,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  const labels = await operation<{ id: string; display: string }[]>(
    app.baseURL,
    'authz',
    'userTypeServerFns',
    'all',
    undefined,
    admin,
  );
  expect(
    labels.value!.find((label) => label.id === created.value!.id)?.display,
  ).toBe('Developer');
  await operation(
    app.baseURL,
    'users',
    'userServerFns',
    'updateUserType',
    { userId, userTypeId: '01930000-0000-7000-8000-000000000101' },
    admin,
  );
}, 30000);

test('user type deletion retains the row, is blocked by non-deleted profiles, and ignores deleted references', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const created = await operation<{ id: string }>(
    app.baseURL,
    'authz',
    'userTypeServerFns',
    'create',
    { display: 'Retained label' },
    admin,
  );
  const userTypeId = created.value!.id;
  const assign = (target: string, type: string | null) =>
    operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateUserType',
      { userId: target, userTypeId: type },
      admin,
    );
  expect(await assign(userId, userTypeId)).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'authz',
      'userTypeServerFns',
      'remove',
      { userTypeId },
      admin,
    ),
  ).toMatchObject({
    ok: false,
    error: 'User type is assigned to a non-deleted profile',
  });
  expect(await assign(userId, null)).toMatchObject({ ok: true });
  // A retained deleted reference is a fixture precondition, not a deletion UI.
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET user_type_id=$1,deleted_at=clock_timestamp() WHERE status='invited'`,
    [userTypeId],
  );
  expect(
    await operation(
      app.baseURL,
      'authz',
      'userTypeServerFns',
      'remove',
      { userTypeId },
      admin,
    ),
  ).toMatchObject({ ok: true });
  const labels = await operation<{ id: string }[]>(
    app.baseURL,
    'authz',
    'userTypeServerFns',
    'all',
    undefined,
    admin,
  );
  expect(labels.value!.some((label) => label.id === userTypeId)).toBe(false);
  expect(await assign(userId, userTypeId)).toMatchObject({
    ok: false,
    error: 'User type is deleted or does not exist',
  });
}, 30000);
