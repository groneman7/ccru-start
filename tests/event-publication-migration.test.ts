import { execFile } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Client } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let prior: string;
const execute = promisify(execFile);

const apply = (url: string, folder?: string) =>
  execute(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/db/migrate.ts',
      '--apply',
      ...(folder ? ['--migrations', folder] : []),
    ],
    { env: { ...process.env, MIGRATION_DATABASE_URL: url } },
  );
beforeAll(async () => {
  cluster = await startPostgres();
  prior = mkdtempSync(join(tmpdir(), 'ccru-before-public-events-'));
  cpSync('drizzle/mvp', prior, { recursive: true });
  const path = join(prior, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 11);
  writeFileSync(path, JSON.stringify(journal));
}, 30000);
afterAll(() => {
  cluster?.stop();
  if (prior) rmSync(prior, { recursive: true, force: true });
});
async function seed() {
  const fixture = await cluster.database();
  await apply(fixture.url);
  await fixture.client.query(
    readFileSync('tests/support/retained.sql', 'utf8'),
  );
  return fixture;
}

const eventId = '01930000-0000-7000-8000-000000000301';
async function records(client: Client) {
  const tables = (
    await client.query(
      "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2",
    )
  ).rows;
  const result: Record<string, unknown> = {};
  for (const t of tables)
    result[`${t.table_schema}.${t.table_name}`] = (
      await client.query(
        `SELECT to_jsonb(t) ${t.table_schema === 'calendar' && t.table_name === 'events' ? "-'cancelled_at'-'deleted_at'" : ''} AS row FROM "${t.table_schema}"."${t.table_name}" t ORDER BY id`,
      )
    ).rows;
  return result;
}
test('publication migration preserves all seventeen business tables and existing event instants', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url, prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const before = await records(client);
    expect(Object.keys(before)).toHaveLength(17);
    await apply(url);
    expect(await records(client)).toEqual(before);
    expect(
      (
        await client.query(
          'SELECT cancelled_at,deleted_at FROM calendar.events',
        )
      ).rows,
    ).toEqual([{ cancelled_at: null, deleted_at: null }]);
    expect(JSON.parse((await apply(url)).stdout)).toMatchObject({
      action: 'none',
      pending: [],
    });
  } finally {
    await client.end();
  }
}, 30000);
for (const invalid of ['missing', 'reversed', 'cross-midnight'])
  test(`invalid retained ${invalid} times block migration without inventing an end`, async () => {
    const { url, client } = await cluster.database();
    try {
      await apply(url, prior);
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      if (invalid === 'missing')
        await client.query('UPDATE calendar.events SET time_end=NULL');
      if (invalid === 'reversed')
        await client.query(
          "UPDATE calendar.events SET time_end=time_begin-interval '1 hour'",
        );
      if (invalid === 'cross-midnight')
        await client.query(
          "UPDATE calendar.events SET time_end=time_begin+interval '1 day'",
        );
      const before = await records(client);
      await expect(apply(url)).rejects.toThrow(
        'Existing events need explicit time correction',
      );
      expect(await records(client)).toEqual(before);
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='calendar' AND table_name='events' AND column_name IN ('cancelled_at','deleted_at')",
          )
        ).rows,
      ).toEqual([{ count: 0 }]);
    } finally {
      await client.end();
    }
  }, 30000);
test('event constraints use the organization date regardless of PostgreSQL session timezone', async () => {
  const { client } = await seed();
  try {
    for (const zone of ['UTC', 'Pacific/Auckland', 'America/Los_Angeles']) {
      await client.query(`SET TIME ZONE '${zone}'`);
      await client.query(
        'UPDATE calendar.events SET time_begin=$1,time_end=$2 WHERE id=$3',
        ['2030-01-15T23:00:00Z', '2030-01-16T01:00:00Z', eventId],
      );
      for (const [begin, end] of [
        ['2030-01-16T04:00:00Z', '2030-01-16T06:00:00Z'],
        ['2030-01-15T14:00:00Z', '2030-01-15T14:00:00Z'],
        ['2030-01-15T14:00:00Z', null],
        ['2030-01-15T14:00:00Z', 'infinity'],
      ])
        await expect(
          client.query(
            'UPDATE calendar.events SET time_begin=$1,time_end=$2 WHERE id=$3',
            [begin, end, eventId],
          ),
        ).rejects.toThrow();
    }
  } finally {
    await client.end();
  }
});
