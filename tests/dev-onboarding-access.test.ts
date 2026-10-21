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
  await fixture.client.query(`UPDATE "better-auth"."user" SET
    status='invited', email_verified=false, phone_number=NULL,
    timestamp_onboarding_completed=NULL WHERE email='user@example.invalid'`);
}, 30000);
afterAll(async () => {
  await fixture?.client.end();
  cluster?.stop();
});

test.each(['preview', 'production'])(
  '%s enforces the environment boundary for real sign-in, routing, and server operations',
  async (environment) => {
    const bypass = environment === 'preview';
    const app = await startApplication(fixture.url, {
      VERCEL_ENV: environment,
      DEV_ONBOARDING_BYPASS_EMAILS: 'user@example.invalid',
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
      const forged = await fetch(`${app.baseURL}/api/auth/update-user`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ onboardingBypassed: true }),
      });
      expect(forged.status).toBe(403);
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
