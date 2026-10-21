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
type Definition = {
  id: string;
  name: string;
  display: string;
  parent: string | null;
};
const catalog = <T = unknown>(action: string, data?: unknown, cookie = admin) =>
  operation<T>(
    app.baseURL,
    'users',
    'certificationServerFns',
    action,
    data,
    cookie,
  );
async function create(name: string, parent: string | null = null) {
  const result = await catalog<Definition>('create', {
    name,
    display: name,
    parent,
  });
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
  return result.value!.id;
}

test('a manager cannot make an ancestor a child of its descendant', async () => {
  const root = await create('Training');
  const child = await create('Specialty', root);
  const grandchild = await create('Subspecialty', child);
  expect(
    await catalog('update', {
      certificationId: root,
      data: { parent: grandchild },
    }),
  ).toMatchObject({ ok: false });
  expect(await catalog('byId', { certificationId: root })).toMatchObject({
    ok: true,
    value: { parent: null },
  });
  expect(await catalog('byId', { certificationId: child })).toMatchObject({
    ok: true,
    value: { parent: root },
  });
}, 30000);

test('a manager renames without changing identity and can remove a parent only after its live child is deleted', async () => {
  const parent = await create('Original catalog parent');
  const child = await create('Retained catalog child', parent);
  expect(
    await catalog('update', {
      certificationId: parent,
      data: { display: 'Renamed training', name: 'renamed-training' },
    }),
  ).toMatchObject({ ok: true, value: { id: parent } });
  expect(await catalog('byId', { certificationId: parent })).toMatchObject({
    ok: true,
    value: {
      id: parent,
      name: 'renamed-training',
      display: 'Renamed training',
    },
  });
  expect(await catalog('byId', { certificationId: child })).toMatchObject({
    ok: true,
    value: { parent },
  });
  expect(await catalog('remove', { certificationId: parent })).toMatchObject({
    ok: false,
    error: 'Certification has non-deleted children',
  });
  expect(await catalog('remove', { certificationId: child })).toMatchObject({
    ok: true,
  });
  expect(await catalog('remove', { certificationId: parent })).toMatchObject({
    ok: true,
  });
  const selection = await catalog<Definition[]>('all');
  expect(
    selection.value?.some((item) => item.id === parent || item.id === child),
  ).toBe(false);
  expect(await catalog('byId', { certificationId: child })).toMatchObject({
    ok: false,
    error: 'Certification not found',
  });
  expect(
    await catalog('update', {
      certificationId: parent,
      data: { display: 'Deleted update' },
    }),
  ).toMatchObject({ ok: false });
  expect(
    await catalog('create', {
      name: 'Invalid deleted parent',
      display: 'Invalid',
      parent,
    }),
  ).toMatchObject({
    ok: false,
    error: 'Parent certification is deleted or does not exist',
  });
}, 30000);

test.each(['user@example.invalid', 'officer@example.invalid'])(
  'read-only %s cannot mutate the catalog',
  async (email) => {
    const cookie = await signIn(app.baseURL, email);
    const id = '01930000-0000-7000-8000-000000000111';
    expect(await catalog('all', undefined, cookie)).toMatchObject({ ok: true });
    for (const [action, data] of [
      ['create', { name: 'Denied', display: 'Denied', parent: null }],
      ['update', { certificationId: id, data: { display: 'Denied' } }],
      ['remove', { certificationId: id }],
    ] as const)
      expect(await catalog(action, data, cookie)).toMatchObject({
        ok: false,
        error: 'Forbidden',
      });
  },
  30000,
);

test('an Officer granted user management can organize the shared training and specialty catalog', async () => {
  const cookie = await signIn(app.baseURL, 'officer@example.invalid');
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
    const result = await catalog<Definition>(
      'create',
      { name: 'Officer training', display: 'Officer training', parent: null },
      cookie,
    );
    expect(result).toMatchObject({ ok: true });
    expect(
      await catalog(
        'update',
        {
          certificationId: result.value!.id,
          data: { display: 'Current label' },
        },
        cookie,
      ),
    ).toMatchObject({ ok: true });
    expect(
      await catalog('remove', { certificationId: result.value!.id }, cookie),
    ).toMatchObject({ ok: true });
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
}, 30000);

test('self-parent, unknown parent and blank labels are rejected without changing the definition', async () => {
  const id = await create('Valid relationships');
  expect(
    await catalog('update', { certificationId: id, data: { parent: id } }),
  ).toMatchObject({
    ok: false,
    error: 'Certification hierarchy cannot contain a cycle',
  });
  expect(
    await catalog('update', {
      certificationId: id,
      data: { parent: '01930000-0000-7000-8000-000000000999' },
    }),
  ).toMatchObject({
    ok: false,
    error: 'Parent certification is deleted or does not exist',
  });
  expect(
    await catalog('create', { name: '   ', display: 'Blank', parent: null }),
  ).toMatchObject({ ok: false });
  expect(
    await catalog('update', { certificationId: id, data: { display: '   ' } }),
  ).toMatchObject({ ok: false });
  expect(
    await catalog('update', {
      certificationId: id,
      data: { deletedAt: '2026-01-01' },
    }),
  ).toMatchObject({ ok: false });
  expect(await catalog('byId', { certificationId: id })).toMatchObject({
    ok: true,
    value: { display: 'Valid relationships', parent: null },
  });
}, 30000);

test('catalog screens show current labels and gate editing controls by the shared permissions', async () => {
  const root = await create('Displayed parent');
  const child = await create('Displayed child', root);
  expect(
    await catalog('update', {
      certificationId: root,
      data: { display: 'Current training label' },
    }),
  ).toMatchObject({ ok: true });
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  const readonly = await (
    await fetch(`${app.baseURL}/admin/certifications/${child}`, {
      headers: { cookie: officer },
    })
  ).text();
  expect(readonly).toContain('Current training label');
  expect(readonly).not.toContain('Edit certification');
  expect(readonly).not.toContain('Delete certification');
  expect(readonly).not.toContain('Add certification');
  const editable = await (
    await fetch(`${app.baseURL}/admin/certifications/${child}`, {
      headers: { cookie: admin },
    })
  ).text();
  expect(editable).toContain('Edit certification');
  expect(editable).toContain('Delete certification');
  expect(editable).toContain('Add certification');
  const directCreate = await (
    await fetch(`${app.baseURL}/admin/certifications/new`, {
      headers: { cookie: officer },
    })
  ).text();
  expect(directCreate).toContain(
    'You do not have permission to manage certifications.',
  );
  expect(directCreate).not.toContain('Save certification');
}, 30000);

test('a manager can reparent and clear a parent without changing certification identity', async () => {
  const first = await create('First parent');
  const second = await create('Second parent');
  const child = await create('Moved specialty', first);
  expect(
    await catalog('update', {
      certificationId: child,
      data: { parent: second },
    }),
  ).toMatchObject({ ok: true, value: { id: child } });
  expect(await catalog('byId', { certificationId: child })).toMatchObject({
    ok: true,
    value: { id: child, parent: second },
  });
  expect(
    await catalog('update', { certificationId: child, data: { parent: null } }),
  ).toMatchObject({ ok: true });
  expect(await catalog('byId', { certificationId: child })).toMatchObject({
    ok: true,
    value: { parent: null },
  });
}, 30000);

test('anonymous callers cannot create, edit or delete definitions', async () => {
  for (const [action, data] of [
    ['create', { name: 'Anonymous', display: 'Denied', parent: null }],
    [
      'update',
      {
        certificationId: '01930000-0000-7000-8000-000000000111',
        data: { display: 'Denied' },
      },
    ],
    ['remove', { certificationId: '01930000-0000-7000-8000-000000000111' }],
  ] as const)
    expect(await catalog(action, data, '')).toMatchObject({
      ok: false,
      error: 'Unauthorized',
    });
}, 30000);
