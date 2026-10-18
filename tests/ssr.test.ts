import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';

let server: ChildProcess | undefined;
let baseURL = '';
let serverOutput = '';

beforeAll(async () => {
  server = spawn(
    process.execPath,
    [
      resolve('node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Anonymous smoke requests must not use the configured database or send telemetry.
        DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
        BETTER_AUTH_URL: 'http://localhost:3000',
        BETTER_AUTH_SECRET: 'local-ssr-smoke-test-secret-not-for-production',
        GOOGLE_CLIENT_ID: 'local-smoke-test',
        GOOGLE_CLIENT_SECRET: 'local-smoke-test',
        VITE_SENTRY_DSN: '',
        SENTRY_AUTH_TOKEN: '',
        VITE_PUBLIC_POSTHOG_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  await new Promise<void>((ready, reject) => {
    const capture = (chunk: Buffer) => {
      serverOutput += stripVTControlCharacters(chunk.toString());
      const address = serverOutput.match(
        /Local:\s+(http:\/\/127\.0\.0\.1:\d+)/,
      );
      if (address) {
        baseURL = address[1];
        ready();
      }
    };
    server!.stdout!.on('data', capture);
    server!.stderr!.on('data', capture);
    server!.once('error', reject);
    server!.once('exit', (code) => {
      reject(
        new Error(`Smoke-test server exited before startup (code ${code}).`),
      );
    });
  });
}, 30_000);

afterAll(async () => {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const running = server;
  await new Promise<void>((done) => {
    const timeout = setTimeout(() => {
      running.kill('SIGKILL');
      done();
    }, 5_000);
    running.once('exit', () => {
      clearTimeout(timeout);
      done();
    });
    running.kill('SIGTERM');
  });
});

test('renders the sign-in page through the real Start server handler', async () => {
  const response = await fetch(`${baseURL}/sign-in`);
  const iterableFailure = serverOutput.includes('object is not iterable');

  expect(
    response.status,
    iterableFailure
      ? 'Start server routing failed: object is not iterable.'
      : 'The anonymous sign-in page should render successfully.',
  ).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/html');
  const html = await response.text();
  expect(html).toContain('type="email"');
  expect(html).toContain('type="password"');
}, 30_000);

test('forwards anonymous session requests to the authentication handler', async () => {
  const response = await fetch(`${baseURL}/api/auth/get-session`);

  expect(response.status).toBe(200);
  expect(await response.json()).toBeNull();
}, 30_000);

test('renders a not-found response for an unmatched URL', async () => {
  const response = await fetch(`${baseURL}/__ssr_smoke_missing__`);

  expect(response.status).toBe(404);
  expect(response.headers.get('content-type')).toContain('text/html');
}, 30_000);
