import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { startPostgres } from './support/postgres';

const execute = promisify(execFile);
let cluster: Awaited<ReturnType<typeof startPostgres>>;
beforeAll(async () => {
  cluster = await startPostgres();
}, 30000);
afterAll(() => cluster?.stop());

test.each(['create', 'adopt'])(
  '%s baseline retains working sign-in, profile, event and staffing routes',
  async (mode) => {
    const { url, client } = await cluster.database();
    let app: Awaited<ReturnType<typeof startApplication>> | undefined;
    try {
      if (mode === 'create') {
        await execute(
          process.execPath,
          ['--import', 'tsx', 'scripts/db/migrate.ts', '--apply'],
          { env: { ...process.env, MIGRATION_DATABASE_URL: url } },
        );
      } else
        await client.query(
          readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
        );
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      app = await startApplication(url);
      const { baseURL } = app;
      expect((await fetch(`${baseURL}/sign-in`)).status, app.output()).toBe(
        200,
      );
      const signIn = await fetch(`${baseURL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          email: 'user@example.invalid',
          password: 'fixture-password-36',
        }),
      });
      expect(signIn.status, await signIn.clone().text()).toBe(200);
      const cookie = signIn.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      expect(cookie).toContain('session_token');
      const headers = { cookie };
      const sessionBefore = await (
        await fetch(`${baseURL}/api/auth/get-session`, { headers })
      ).json();
      expect(sessionBefore.user).toMatchObject({
        id: '01930000-0000-7000-8000-000000000001',
        role: 'User',
        status: 'active',
      });
      for (const phase of ['before', 'after']) {
        if (phase === 'after')
          await execute(
            process.execPath,
            ['--import', 'tsx', 'scripts/db/migrate.ts', '--apply'],
            { env: { ...process.env, MIGRATION_DATABASE_URL: url } },
          );
        const event = await fetch(
          `${baseURL}/calendar/events/01930000-0000-7000-8000-000000000301`,
          { headers },
        );
        expect(event.status, app.output()).toBe(200);
        const eventHTML = await event.text();
        expect(eventHTML).toContain('Historical fixture');
        expect(eventHTML).toContain('Fixture position');
        expect(eventHTML).toContain('Fixture User');
        const profile = await fetch(
          `${baseURL}/admin/users/01930000-0000-7000-8000-000000000001/profile`,
          { headers },
        );
        expect(profile.status, app.output()).toBe(200);
        expect(await profile.text()).toContain('Fixture User');
        const session = await (
          await fetch(`${baseURL}/api/auth/get-session`, { headers })
        ).json();
        expect(session.user).toEqual(sessionBefore.user);
        expect(session.session.id).toBe(sessionBefore.session.id);
      }
    } finally {
      await app?.stop();
      await client.end();
    }
  },
  90000,
);
