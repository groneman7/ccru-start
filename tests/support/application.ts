import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { Pool } from 'pg';

export async function startApplication(databaseURL: string) {
  const pool = new Pool({ connectionString: databaseURL });
  const proxy = createServer(async (request, response) => {
    if (request.headers['neon-connection-string'] !== databaseURL) {
      response.writeHead(400).end();
      return;
    }
    const client = await pool.connect();
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const input = JSON.parse(Buffer.concat(chunks).toString()) as {
        query: string;
        params: unknown[];
        queries?: { query: string; params: unknown[] }[];
      };
      const run = (q: { query: string; params: unknown[] }) =>
        client.query({
          text: q.query,
          values: q.params,
          rowMode: 'array',
          types: { getTypeParser: () => (value: string) => value },
        });
      let output;
      if (input.queries) {
        await client.query('BEGIN');
        const results = [];
        for (const q of input.queries) results.push(await run(q));
        await client.query('COMMIT');
        output = { results };
      } else output = await run(input);
      response
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify(output));
    } catch (error) {
      await client.query('ROLLBACK');
      response.writeHead(400, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          message:
            error instanceof Error ? error.message : 'Fixture query failed',
        }),
      );
    } finally {
      client.release();
    }
  });
  await new Promise<void>((done, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', done);
  });
  const address = proxy.address();
  if (!address || typeof address === 'string')
    throw new Error('No proxy address');
  const server = spawn(
    process.execPath,
    [
      '--import',
      resolve('tests/support/neon-local.mjs'),
      resolve('node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '0',
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseURL,
        CCRU_TEST_SQL_URL: `http://127.0.0.1:${address.port}/sql`,
        BETTER_AUTH_URL: 'http://localhost:3000',
        BETTER_AUTH_SECRET: 'local-migration-fixture-secret-not-production',
        GOOGLE_CLIENT_ID: 'fixture',
        GOOGLE_CLIENT_SECRET: 'fixture',
        VITE_SENTRY_DSN: '',
        SENTRY_AUTH_TOKEN: '',
        VITE_PUBLIC_POSTHOG_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  async function stop() {
    if (server.exitCode === null && server.signalCode === null) {
      await new Promise<void>((done) => {
        const timeout = setTimeout(() => server.kill('SIGKILL'), 5000);
        server.once('exit', () => {
          clearTimeout(timeout);
          done();
        });
        server.kill('SIGTERM');
      });
    }
    await new Promise<void>((done) => proxy.close(() => done()));
    await pool.end();
  }
  try {
    const baseURL = await new Promise<string>((done, reject) => {
      const timeout = setTimeout(
        () =>
          reject(new Error(`Fixture application startup timed out: ${output}`)),
        30000,
      );
      const capture = (chunk: Buffer) => {
        output += stripVTControlCharacters(chunk.toString());
        const match = output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) {
          clearTimeout(timeout);
          done(match[1]);
        }
      };
      server.stdout.on('data', capture);
      server.stderr.on('data', capture);
      server.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      server.once('exit', () => {
        clearTimeout(timeout);
        reject(new Error(output));
      });
    });
    return { baseURL, stop, output: () => output };
  } catch (error) {
    await stop();
    throw error;
  }
}
