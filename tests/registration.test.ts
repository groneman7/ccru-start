import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let fixture: Awaited<ReturnType<typeof cluster.database>>;
let app: Awaited<ReturnType<typeof startApplication>>;
beforeAll(async () => {
  cluster = await startPostgres();
  fixture = await cluster.database();
  await promisify(execFile)(
    process.execPath,
    ['--import', 'tsx', 'scripts/db/migrate.ts', '--apply'],
    { env: { ...process.env, MIGRATION_DATABASE_URL: fixture.url } },
  );
  app = await startApplication(fixture.url);
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
});

test('registration sends verification; saved profile completes only after verification', async () => {
  const response = await fetch(`${app.baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({
      name: 'New Volunteer',
      nameFirst: 'New',
      nameLast: 'Volunteer',
      email: 'new@example.invalid',
      password: 'fixture-password-36',
      callbackURL: '/',
    }),
  });
  expect(response.status).toBe(200);
  const { user } = await response.json();
  const account = await fixture.client.query(
    'SELECT status FROM "better-auth"."user" WHERE id=$1',
    [user.id],
  );
  expect(
    account.rows[0].status,
    'new accounts need onboarding permissions',
  ).toBe('invited');
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateOnboardingProfile',
      { userId: user.id, phoneNumber: '+15550100100' },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'completeOnboarding',
      { userId: user.id },
      cookie,
    ),
  ).toMatchObject({
    ok: false,
    error: 'Complete verified profile requirements first',
  });
  const saved = await fixture.client.query(
    'SELECT phone_number, timestamp_onboarding_completed FROM "better-auth"."user" WHERE id=$1',
    [user.id],
  );
  expect(saved.rows[0]).toMatchObject({
    phone_number: '+15550100100',
    timestamp_onboarding_completed: null,
  });
  expect(app.emails).toHaveLength(1);
  expect(app.emails[0]).toMatchObject({
    to: 'new@example.invalid',
    subject: 'Verify your email address',
  });
  const link = new URL(app.emails[0].html.match(/href="([^"]+)"/)![1]);
  const verified = await fetch(`${app.baseURL}${link.pathname}${link.search}`, {
    redirect: 'manual',
  });
  expect(verified.status).toBe(302);
  expect(
    await operation(
      app.baseURL,
      'users',
      'userServerFns',
      'completeOnboarding',
      { userId: user.id },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  const completed = await fixture.client.query(
    'SELECT status, email_verified, timestamp_onboarding_completed FROM "better-auth"."user" WHERE id=$1',
    [user.id],
  );
  expect(completed.rows[0]).toMatchObject({
    status: 'active',
    email_verified: true,
    timestamp_onboarding_completed: expect.any(Date),
  });
}, 30000);

test('registration invokes the Resend verification callback', async () => {
  const before = app.emails.length;
  const response = await fetch(`${app.baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({
      name: 'Email Volunteer',
      nameFirst: 'Email',
      nameLast: 'Volunteer',
      email: 'email@example.invalid',
      password: 'fixture-password-36',
      callbackURL: '/',
    }),
  });
  expect(response.status).toBe(200);
  await expect
    .poll(() => app.emails.length, { timeout: 1000 })
    .toBe(before + 1);
}, 30000);
