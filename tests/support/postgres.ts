import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';

// Own a temporary cluster: no configured application URL is ever used for fixtures.
export async function startPostgres() {
  const bin =
    process.env.PG_BIN ??
    execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
  const root = mkdtempSync(join(tmpdir(), 'ccru-pg-'));
  const data = join(root, 'data');
  const server = createServer();
  await new Promise<void>((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const port = address.port;
  await new Promise<void>((done) => server.close(() => done()));
  execFileSync(
    join(bin, 'initdb'),
    ['-D', data, '-U', 'migration_test', '-A', 'trust', '--no-locale'],
    { stdio: 'pipe' },
  );
  execFileSync(
    join(bin, 'pg_ctl'),
    [
      '-D',
      data,
      '-l',
      join(root, 'postgres.log'),
      '-o',
      `-F -h 127.0.0.1 -p ${port} -k ${root}`,
      '-w',
      'start',
    ],
    { stdio: 'pipe' },
  );
  const baseURL = `postgresql://migration_test@127.0.0.1:${port}`;
  let next = 0;
  return {
    async database() {
      const name = `fixture_${++next}`;
      const admin = new Client({ connectionString: `${baseURL}/postgres` });
      await admin.connect();
      try {
        await admin.query(`CREATE DATABASE ${name}`);
      } finally {
        await admin.end();
      }
      const url = `${baseURL}/${name}`;
      const client = new Client({ connectionString: url });
      await client.connect();
      // Randomness boundary only. The retained target uses pg_uuidv7's C function;
      // local tests need no extension installed into the developer's PostgreSQL.
      await client.query(`CREATE FUNCTION public.uuid_generate_v7() RETURNS uuid LANGUAGE SQL VOLATILE AS $$
        SELECT (lpad(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint),12,'0') || '7' || substr(replace(gen_random_uuid()::text,'-',''),14,3) || '8' || substr(replace(gen_random_uuid()::text,'-',''),18,15))::uuid
      $$`);
      return { url, client };
    },
    stop() {
      try {
        execFileSync(
          join(bin, 'pg_ctl'),
          ['-D', data, '-m', 'immediate', '-w', 'stop'],
          { stdio: 'pipe' },
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  };
}
