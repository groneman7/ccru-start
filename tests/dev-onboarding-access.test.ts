import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
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
  const defaults = await fixture.client.query(
    'SELECT is_dev_account FROM "better-auth"."user"',
  );
  expect(defaults.rows.every((row) => row.is_dev_account === false)).toBe(true);
  await fixture.client
    .query(`UPDATE "better-auth"."user" SET status='active' WHERE role='Administrator';
    INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at)
    SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a
    WHERE a.provider_id='credential' AND u.id::text<>a.user_id`);
  await fixture.client.query(
    readFileSync('tests/support/ready-identities.sql', 'utf8'),
  );
  await fixture.client.query(`UPDATE "better-auth"."user" SET
    status='invited', email_verified=false, phone_number=NULL, is_dev_account=true,
    timestamp_onboarding_completed=NULL WHERE email='user@example.invalid'`);
}, 30000);
afterAll(async () => {
  await fixture?.client.end();
  cluster?.stop();
});

test.each([
  ['preview', 'true', true],
  ['production', 'true', false],
  ['preview', 'false', false],
])(
  '%s with switch %s permits bypass %s for sign-in, routing, and operations',
  async (environment, enabled, bypass) => {
    const app = await startApplication(fixture.url, {
      VERCEL_ENV: environment,
      DEV_ONBOARDING_BYPASS_ENABLED: enabled,
    });
    try {
      const cookie = await signIn(app.baseURL, 'user@example.invalid');
      const page = await fetch(`${app.baseURL}/calendar/2026/10`, {
        headers: { cookie },
        redirect: 'manual',
      });
      expect(page.status).toBe(bypass ? 200 : 307);
      if (!bypass) expect(page.headers.get('location')).toBe('/onboarding');
      const onboarding = await fetch(`${app.baseURL}/onboarding`, {
        headers: { cookie },
        redirect: 'manual',
      });
      expect(onboarding.status).toBe(bypass ? 307 : 200);
      if (bypass) expect(onboarding.headers.get('location')).toBe('/');
      expect(
        await operation(
          app.baseURL,
          'calendar',
          'positionServerFns',
          'all',
          undefined,
          cookie,
        ),
      ).toMatchObject({ ok: bypass });
      expect(
        await operation(
          app.baseURL,
          'registration',
          'registrationServerFns',
          'updateMode',
          { mode: 'open' },
          cookie,
        ),
      ).toMatchObject({ ok: false });
      const verification = await fetch(
        `${app.baseURL}/api/auth/send-verification-email`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie,
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            email: 'user@example.invalid',
            callbackURL: '/onboarding',
          }),
        },
      );
      expect(verification.status).toBe(200);
      expect(app.emails).toHaveLength(bypass ? 0 : 1);
      for (const data of [
        { onboardingBypassed: true },
        { isDevAccount: true },
      ]) {
        const forged = await fetch(`${app.baseURL}/api/auth/update-user`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie,
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify(data),
        });
        expect(forged.status).toBe(403);
      }
      const stored = await fixture.client.query(
        `SELECT status,email_verified,phone_number,timestamp_onboarding_completed FROM "better-auth"."user" WHERE email='user@example.invalid'`,
      );
      expect(stored.rows[0]).toEqual({
        status: 'invited',
        email_verified: false,
        phone_number: null,
        timestamp_onboarding_completed: null,
      });
      await fixture.client.query(
        `UPDATE "better-auth"."user" SET status='inactive' WHERE email='user@example.invalid'`,
      );
      await expect(signIn(app.baseURL, 'user@example.invalid')).rejects.toThrow(
        'inactive',
      );
    } finally {
      await fixture.client.query(
        `UPDATE "better-auth"."user" SET status='invited' WHERE email='user@example.invalid'`,
      );
      await app.stop();
    }
  },
  60000,
);

test('Developers manage dev flags through the profile; revocation applies to existing sessions', async () => {
  const app = await startApplication(fixture.url, { VERCEL_ENV: 'preview' });
  const userId = '01930000-0000-7000-8000-000000000001';
  const change = (isDevAccount: boolean, cookie: string, targetId = userId) =>
    operation(
      app.baseURL,
      'users',
      'userServerFns',
      'updateDevAccount',
      { userId: targetId, isDevAccount },
      cookie,
    );
  try {
    const user = await signIn(app.baseURL, 'user@example.invalid');
    const developer = await signIn(app.baseURL, 'developer@example.invalid');
    for (const email of [
      'user@example.invalid',
      'officer@example.invalid',
      'admin@example.invalid',
    ]) {
      const cookie = await signIn(app.baseURL, email);
      expect(await change(true, cookie)).toMatchObject({ ok: false });
      if (email !== 'user@example.invalid') {
        const page = await (
          await fetch(`${app.baseURL}/admin/users/${userId}/profile`, {
            headers: { cookie },
          })
        ).text();
        expect(page).not.toContain('Development account');
      }
    }
    const page = await (
      await fetch(`${app.baseURL}/admin/users/${userId}/profile`, {
        headers: { cookie: developer },
      })
    ).text();
    expect(page).toContain('Development account');
    expect(await change(false, developer)).toMatchObject({
      ok: true,
      value: { id: userId, isDevAccount: false },
    });
    expect(
      await operation(
        app.baseURL,
        'calendar',
        'positionServerFns',
        'all',
        undefined,
        user,
      ),
    ).toMatchObject({ ok: false });
    expect(await change(true, developer)).toMatchObject({
      ok: true,
      value: { id: userId, isDevAccount: true },
    });
    expect(
      await operation(
        app.baseURL,
        'calendar',
        'positionServerFns',
        'all',
        undefined,
        user,
      ),
    ).toMatchObject({ ok: true });
    expect(
      await operation(
        app.baseURL,
        'users',
        'userServerFns',
        'updateOnboardingProfile',
        { userId, isDevAccount: true },
        user,
      ),
    ).toMatchObject({ ok: false });
    const registration = await fetch(`${app.baseURL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'forged@example.invalid',
        name: 'Forged User',
        nameFirst: 'Forged',
        nameLast: 'User',
        password: 'fixture-password-36',
        isDevAccount: true,
      }),
    });
    expect(registration.status).toBe(403);
    const deletedId = '01930000-0000-7000-8000-000000000005';
    await fixture.client.query(
      'UPDATE "better-auth"."user" SET deleted_at=now() WHERE id=$1',
      [deletedId],
    );
    expect(await change(true, developer, deletedId)).toMatchObject({
      ok: false,
      error: 'Profile not found',
    });
    expect(
      (
        await fixture.client.query(
          'SELECT email_verified,phone_number,timestamp_onboarding_completed FROM "better-auth"."user" WHERE id=$1',
          [userId],
        )
      ).rows[0],
    ).toEqual({
      email_verified: false,
      phone_number: null,
      timestamp_onboarding_completed: null,
    });
  } finally {
    await app.stop();
  }
}, 60000);
