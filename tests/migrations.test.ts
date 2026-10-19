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

const execute = promisify(execFile);
let cluster: Awaited<ReturnType<typeof startPostgres>>;
let baselineFolder: string;

beforeAll(async () => {
  cluster = await startPostgres();
  baselineFolder = mkdtempSync(join(tmpdir(), 'ccru-baseline-'));
  cpSync('drizzle/mvp', baselineFolder, { recursive: true });
  const journalPath = join(baselineFolder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  journal.entries = journal.entries.slice(0, 1);
  writeFileSync(journalPath, JSON.stringify(journal));
}, 30_000);
afterAll(() => {
  cluster?.stop();
  if (baselineFolder) rmSync(baselineFolder, { recursive: true, force: true });
});

async function migrate(url: string, apply = false, folder = baselineFolder) {
  const { stdout } = await execute(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/db/migrate.ts',
      apply ? '--apply' : '--check',
      ...(folder ? ['--migrations', folder] : []),
    ],
    {
      env: { ...process.env, MIGRATION_DATABASE_URL: url },
    },
  );
  return JSON.parse(stdout);
}

test('an empty database is planned read-only, initialized, and then needs no changes', async () => {
  const { url, client } = await cluster.database();
  try {
    expect(await migrate(url)).toMatchObject({
      action: 'create',
      applied: false,
      pending: ['0000_current_baseline'],
    });
    expect(
      (await client.query(`SELECT to_regclass('calendar.events') AS events`))
        .rows,
    ).toEqual([{ events: null }]);
    expect(await migrate(url, true)).toMatchObject({
      action: 'create',
      applied: true,
    });
    expect(await migrate(url)).toMatchObject({
      action: 'none',
      applied: false,
      pending: [],
    });
    expect(await migrate(url, true)).toMatchObject({
      action: 'none',
      applied: true,
    });
  } finally {
    await client.end();
  }
}, 30_000);

async function snapshot(client: Client) {
  const tables = await client.query(
    `SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2`,
  );
  const rows: Record<string, unknown[]> = {};
  for (const t of tables.rows) {
    const name = `"${t.table_schema}"."${t.table_name}"`;
    rows[name] = (
      await client.query(
        `SELECT to_jsonb(t) AS data FROM ${name} t ORDER BY id`,
      )
    ).rows;
  }
  return rows;
}

test('adopts the already-current retained schema without replaying DDL or changing any business row', async () => {
  const { url, client } = await cluster.database();
  try {
    await client.query(
      readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
    );
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const before = await snapshot(client);
    expect(Object.keys(before)).toHaveLength(12);
    expect(before['"better-auth"."user"']).toHaveLength(5);
    expect(await migrate(url)).toMatchObject({
      action: 'adopt',
      applied: false,
    });
    expect(
      (
        await client.query(
          `SELECT to_regclass('_drizzle._mvp_migrations') AS ledger`,
        )
      ).rows,
    ).toEqual([{ ledger: null }]);
    expect(await migrate(url, true)).toMatchObject({
      action: 'adopt',
      applied: true,
    });
    expect(await snapshot(client)).toEqual(before);
    expect(await migrate(url, true)).toMatchObject({
      action: 'none',
      pending: [],
    });
    expect(await snapshot(client)).toEqual(before);
  } finally {
    await client.end();
  }
}, 30_000);

test('refuses an archived migration ledger instead of claiming incompatible history was applied', async () => {
  const { url, client } = await cluster.database();
  try {
    await client.query(
      readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
    );
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await client.query(
      `CREATE SCHEMA _drizzle; CREATE TABLE _drizzle._migrations (id serial PRIMARY KEY, hash text, created_at bigint); INSERT INTO _drizzle._migrations (hash,created_at) VALUES ('unreviewed-legacy-history',1771205165328)`,
    );
    const before = await snapshot(client);
    await expect(migrate(url, true)).rejects.toThrow(
      'Unrecognized migration ledger',
    );
    expect(await snapshot(client)).toEqual(before);
    expect(
      (await client.query('SELECT hash FROM _drizzle._migrations')).rows,
    ).toEqual([{ hash: 'unreviewed-legacy-history' }]);
    expect(
      (
        await client.query(
          `SELECT to_regclass('_drizzle._mvp_migrations') AS ledger`,
        )
      ).rows,
    ).toEqual([{ ledger: null }]);
  } finally {
    await client.end();
  }
}, 30_000);

test.each([
  [
    'column type',
    'ALTER TABLE calendar.events ALTER COLUMN location TYPE text USING location::text',
  ],
  [
    'required field',
    'ALTER TABLE calendar.events ALTER COLUMN time_begin DROP NOT NULL',
  ],
  [
    'role representation',
    'ALTER TABLE "better-auth"."user" RENAME COLUMN display TO display_name',
  ],
  [
    'catalog relationship',
    'ALTER TABLE authz.certifications DROP CONSTRAINT parent_id',
  ],
  ['enum state', "ALTER TYPE public.slot_status ADD VALUE 'unknown'"],
  ['unexpected data shape', 'CREATE TABLE authz.user_certifications (id uuid)'],
  ['row visibility', 'ALTER TABLE calendar.events ENABLE ROW LEVEL SECURITY'],
  [
    'foreign-key enforcement',
    'ALTER TABLE calendar.junction_slots DISABLE TRIGGER ALL',
  ],
])(
  'rejects %s drift without repairing or deleting retained records',
  async (_name, change) => {
    const { url, client } = await cluster.database();
    try {
      await client.query(
        readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
      );
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      await client.query(change);
      const before = await snapshot(client);
      await expect(migrate(url)).rejects.toThrow('Unsupported schema');
      await expect(migrate(url, true)).rejects.toThrow('Unsupported schema');
      expect(await snapshot(client)).toEqual(before);
      expect(
        (
          await client.query(
            `SELECT to_regclass('_drizzle._mvp_migrations') AS ledger`,
          )
        ).rows,
      ).toEqual([{ ledger: null }]);
    } finally {
      await client.end();
    }
  },
  30_000,
);

function futureSequence(sql: string) {
  const folder = mkdtempSync(join(tmpdir(), 'ccru-sequence-'));
  cpSync(baselineFolder, folder, { recursive: true });
  const path = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries.push({
    ...journal.entries[0],
    idx: 1,
    when: journal.entries[0].when + 1,
    tag: '0001_fixture_forward',
  });
  writeFileSync(path, JSON.stringify(journal));
  writeFileSync(join(folder, '0001_fixture_forward.sql'), sql);
  return folder;
}

test('applies a later generated migration once and rejects tampered ledger history', async () => {
  const { url, client } = await cluster.database();
  const folder = futureSequence(
    `ALTER TABLE calendar.events ADD COLUMN fixture_marker text DEFAULT 'forward-migration'`,
  );
  try {
    await migrate(url, true);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    expect(await migrate(url, false, folder)).toMatchObject({
      action: 'migrate',
      pending: ['0001_fixture_forward'],
    });
    expect(await migrate(url, true, folder)).toMatchObject({
      action: 'migrate',
      applied: true,
    });
    expect(
      (await client.query('SELECT fixture_marker FROM calendar.events')).rows,
    ).toEqual([{ fixture_marker: 'forward-migration' }]);
    const before = await snapshot(client);
    expect(await migrate(url, true, folder)).toMatchObject({
      action: 'none',
      pending: [],
    });
    expect(await snapshot(client)).toEqual(before);
    await client.query(
      `UPDATE _drizzle._mvp_migrations SET hash='tampered' WHERE id=1`,
    );
    await expect(migrate(url, true, folder)).rejects.toThrow(
      'Migration ledger is not an exact prefix',
    );
    expect(await snapshot(client)).toEqual(before);
  } finally {
    await client.end();
    rmSync(folder, { recursive: true, force: true });
  }
}, 30_000);

test('rolls back a failed later migration together with its ledger entry', async () => {
  const { url, client } = await cluster.database();
  const folder = futureSequence(
    'ALTER TABLE calendar.events ADD COLUMN fixture_marker text; --> statement-breakpoint\n SELECT 1/0',
  );
  try {
    await migrate(url, true);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const before = await snapshot(client);
    await expect(migrate(url, true, folder)).rejects.toThrow();
    expect(await snapshot(client)).toEqual(before);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM _drizzle._mvp_migrations',
        )
      ).rows,
    ).toEqual([{ count: 1 }]);
    expect(await migrate(url)).toMatchObject({ action: 'none', pending: [] });
  } finally {
    await client.end();
    rmSync(folder, { recursive: true, force: true });
  }
}, 30000);

test('serializes simultaneous migration commands without replaying initialization', async () => {
  const { url, client } = await cluster.database();
  try {
    const results = await Promise.all([migrate(url, true), migrate(url, true)]);
    expect(results.map((r) => r.action).sort()).toEqual(['create', 'none']);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM _drizzle._mvp_migrations',
        )
      ).rows,
    ).toEqual([{ count: 1 }]);
  } finally {
    await client.end();
  }
}, 30000);

test('refuses the incompatible archived schema without guessing role or location conversions', async () => {
  const { url, client } = await cluster.database();
  try {
    await client.query(readFileSync('drizzle/0000_spooky_wendigo.sql', 'utf8'));
    await client.query(readFileSync('drizzle/0001_legal_magik.sql', 'utf8'));
    await client.query(
      `INSERT INTO authz.system_roles (id,name,display) VALUES ('01930000-0000-7000-8000-000000000801','custom','Custom legacy role')`,
    );
    const before = await snapshot(client);
    await expect(migrate(url, true)).rejects.toThrow('Unsupported schema');
    expect(await snapshot(client)).toEqual(before);
    expect(
      (
        await client.query(
          `SELECT to_regclass('_drizzle._mvp_migrations') AS ledger`,
        )
      ).rows,
    ).toEqual([{ ledger: null }]);
  } finally {
    await client.end();
  }
}, 30000);
