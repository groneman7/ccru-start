import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let app: Awaited<ReturnType<typeof startApplication>>;
let fixture: Awaited<ReturnType<typeof cluster.database>>;
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
  app = await startApplication(fixture.url);
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
});

test('anonymous callers cannot create staffing positions by calling the server function directly', async () => {
  const result = await operation(
    app.baseURL,
    'calendar',
    'positionServerFns',
    'create',
    { name: 'anonymous', display: 'Unauthorized', description: null },
  );
  expect(result, JSON.stringify(result)).toMatchObject({
    ok: false,
    error: 'Unauthorized',
  });
}, 30000);

test.each([
  ['officer@example.invalid', false],
  ['admin@example.invalid', false],
  ['developer@example.invalid', true],
] as const)(
  'Developer tools access for %s matches the shared CASL rules',
  async (email, allowed) => {
    const cookie = await signIn(app.baseURL, email);
    const response = await fetch(`${app.baseURL}/dev-tools/ui`, {
      headers: { cookie },
    });
    expect(response.status).toBe(200);
    const page = await response.text();
    expect(
      page.includes('You do not have permission to access these tools.'),
    ).toBe(!allowed);
    expect(page.includes('Developer Tools')).toBe(allowed);
  },
  30000,
);

test('an Administrator grants and revokes scheduling authority independently of user management', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  const data = {
    name: 'granted-position',
    display: 'Granted position',
    description: null,
  };
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      data,
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      {
        userId: '01930000-0000-7000-8000-000000000002',
        canManageScheduling: true,
        canManageUsers: false,
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      data,
      officer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'certificationServerFns',
      'create',
      { name: 'denied-cert', display: 'Denied', parent: null },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      {
        userId: '01930000-0000-7000-8000-000000000002',
        canManageScheduling: false,
        canManageUsers: false,
      },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      data,
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
}, 30000);

test('auth admin endpoints cannot bypass role boundaries or physically delete domain users', async () => {
  for (const email of [
    'officer@example.invalid',
    'admin@example.invalid',
    'developer@example.invalid',
  ]) {
    const cookie = await signIn(app.baseURL, email);
    for (const [path, body] of [
      [
        'set-role',
        { userId: '01930000-0000-7000-8000-000000000001', role: 'Developer' },
      ],
      [
        'update-user',
        {
          userId: '01930000-0000-7000-8000-000000000001',
          data: { role: 'Developer' },
        },
      ],
      ['remove-user', { userId: '01930000-0000-7000-8000-000000000005' }],
    ] as const) {
      const response = await fetch(`${app.baseURL}/api/auth/admin/${path}`, {
        method: 'POST',
        headers: {
          cookie,
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify(body),
      });
      expect(response.status, `${email}: ${path}`).toBe(403);
    }
  }
}, 30000);

test('all Officers can view profiles, but only the independently granted user manager can mutate users or certifications', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid'),
    officer = await signIn(app.baseURL, 'officer@example.invalid');
  const target = '01930000-0000-7000-8000-000000000001',
    officerId = '01930000-0000-7000-8000-000000000002';
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId: target },
      officer,
    ),
  ).toMatchObject({ ok: true, value: { role: 'User' } });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateUserType',
      { userId: target, userTypeId: '01930000-0000-7000-8000-000000000101' },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId: officerId, canManageUsers: true },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'certificationServerFns',
      'create',
      { name: 'managed-cert', display: 'Managed', parent: null },
      officer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      { name: 'not-scheduling', display: 'Denied', description: null },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateUserType',
      { userId: target, userTypeId: '01930000-0000-7000-8000-000000000101' },
      officer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      {
        userId: officerId,
        canManageScheduling: true,
        role: 'Administrator',
        actorId: '01930000-0000-7000-8000-000000000004',
      },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
}, 30000);

test('ordinary users cannot obtain authority from client actor, role, capability or ownership fields', async () => {
  const cookie = await signIn(app.baseURL, 'user@example.invalid');
  const spoof = {
    actorId: '01930000-0000-7000-8000-000000000004',
    role: 'Developer',
    canManageScheduling: true,
    canManageUsers: true,
  };
  for (const [module, group, action, data] of [
    [
      'calendar',
      'positionServerFns',
      'create',
      {
        name: 'spoof-position',
        display: 'Denied',
        description: null,
        ...spoof,
      },
    ],
    [
      'calendar',
      'eventServerFns',
      'create',
      {
        name: 'spoof-event',
        description: null,
        location: null,
        timeBegin: '2026-01-01T14:00:00Z',
        timeEnd: '2026-01-01T15:00:00Z',
        createdBy: spoof.actorId,
        ...spoof,
      },
    ],
    [
      'calendar',
      'slotServerFns',
      'create',
      {
        shiftId: '01930000-0000-7000-8000-000000000401',
        userId: '01930000-0000-7000-8000-000000000001',
        ...spoof,
      },
    ],
    [
      'calendar',
      'slotServerFns',
      'reassignUser',
      {
        slotId: '01930000-0000-7000-8000-000000000501',
        userId: spoof.actorId,
        ...spoof,
      },
    ],
    [
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId: '01930000-0000-7000-8000-000000000001', ...spoof },
    ],
    [
      'users',
      'userServerFns',
      'updateStatus',
      {
        userId: '01930000-0000-7000-8000-000000000001',
        status: 'inactive',
        ...spoof,
      },
    ],
    [
      'users',
      'userServerFns',
      'updateUserType',
      {
        userId: '01930000-0000-7000-8000-000000000001',
        userTypeId: '01930000-0000-7000-8000-000000000101',
        ...spoof,
      },
    ],
    [
      'users',
      'userServerFns',
      'updateOnboardingProfile',
      { userId: spoof.actorId, nameFirst: 'Denied', ...spoof },
    ],
    ['users', 'userServerFns', 'byId', { userId: spoof.actorId, ...spoof }],
  ] as const)
    expect(
      await operation(app.baseURL, module, group, action, data, cookie),
      action,
    ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId: '01930000-0000-7000-8000-000000000001' },
      cookie,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('only Developers can grant Developer or change an existing Developer role; roles remain singular', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid'),
    developer = await signIn(app.baseURL, 'developer@example.invalid');
  const target = '01930000-0000-7000-8000-000000000001',
    devId = '01930000-0000-7000-8000-000000000004';
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId: target, role: 'Developer' },
      admin,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId: devId, role: 'User' },
      admin,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId: target, role: 'User,Developer' },
      developer,
    ),
  ).toMatchObject({ ok: false });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId: target, canManageUsers: true },
      admin,
    ),
  ).toMatchObject({ ok: false });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId: target, role: 'Developer' },
      developer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId: target },
      admin,
    ),
  ).toMatchObject({
    ok: true,
    value: {
      role: 'Developer',
      canManageScheduling: false,
      canManageUsers: false,
    },
  });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId: target, role: 'User' },
      developer,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('authentication profile writes cannot forge protected completion or permission fields', async () => {
  const cookie = await signIn(app.baseURL, 'user@example.invalid');
  for (const body of [
    { role: 'Developer' },
    { canManageUsers: true },
    { status: 'active', emailVerified: true },
    { timestampOnboardingCompleted: '2026-01-01' },
  ]) {
    const response = await fetch(`${app.baseURL}/api/auth/update-user`, {
      method: 'POST',
      headers: {
        cookie,
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(403);
  }
  const response = await fetch(`${app.baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({
      name: 'Spoof',
      email: 'spoof@example.invalid',
      password: 'fixture-password-36',
      role: 'Developer',
    }),
  });
  expect(response.status).toBe(403);
}, 30000);

test('grant edits preserve the other capability and leaving Officer clears stored grants', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const userId = '01930000-0000-7000-8000-000000000002';
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId, canManageUsers: true },
      admin,
    ),
  ).toMatchObject({ ok: true, value: { canManageUsers: true } });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId, canManageScheduling: true },
      admin,
    ),
  ).toMatchObject({
    ok: true,
    value: { canManageScheduling: true, canManageUsers: true },
  });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId, role: 'Officer' },
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
    value: { canManageScheduling: true, canManageUsers: true },
  });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId, role: 'User' },
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
    value: { role: 'User', canManageScheduling: false, canManageUsers: false },
  });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateSystemRole',
      { userId, role: 'Officer' },
      admin,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('inactive identities cannot exercise authority even when a valid session already exists', async () => {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  const userId = '01930000-0000-7000-8000-000000000002';
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateCapabilities',
      { userId, canManageScheduling: true },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateStatus',
      { userId, status: 'inactive' },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      { name: 'inactive-position', display: 'Denied', description: null },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateStatus',
      { userId, status: 'active' },
      admin,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('a signed-in invited identity can complete its own profile without gaining scheduling authority', async () => {
  const cookie = await signIn(app.baseURL, 'invite@example.invalid');
  const userId = '01930000-0000-7000-8000-000000000005';
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'byId',
      { userId },
      cookie,
    ),
  ).toMatchObject({ ok: true, value: { status: 'invited' } });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateOnboardingProfile',
      { userId, nameFirst: 'Invited fixture' },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  for (const action of ['byId', 'updateOnboardingProfile']) {
    expect(
      await operation(
        app.baseURL,
        'users',
        'userServerFns',
        action,
        {
          userId: '01930000-0000-7000-8000-000000000001',
          nameFirst: 'Denied',
        },
        cookie,
      ),
    ).toMatchObject({ ok: false, error: 'Forbidden' });
  }
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'create',
      { name: 'invited-position', display: 'Denied', description: null },
      cookie,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'completeOnboarding',
      {
        userId,
        timestampOnboardingCompleted: '2026-01-01',
        emailVerified: true,
      },
      cookie,
    ),
  ).toMatchObject({
    ok: false,
    error: 'Complete verified profile requirements first',
  });
}, 30000);
