import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Client } from 'pg';
import { readCatalog } from './catalog';

const args = process.argv.length > 2 ? process.argv.slice(2) : ['--check'];
const apply = args.includes('--apply');
if (
  !['--apply', '--check'].includes(args[0]) ||
  !(
    args.length === 1 ||
    (args.length === 3 && args[1] === '--migrations' && args[2])
  )
) {
  throw new Error(
    'Use --check (read-only) or --apply with an explicit MIGRATION_DATABASE_URL.',
  );
}
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error(
    'MIGRATION_DATABASE_URL is required; application env files are not loaded.',
  );
const folder = resolve(args[2] ?? 'drizzle/mvp');
const journal = JSON.parse(
  readFileSync(resolve(folder, 'meta/_journal.json'), 'utf8'),
) as { entries: { tag: string; when: number }[] };
if (
  !journal.entries.length ||
  journal.entries.some(
    (entry, i) =>
      !Number.isSafeInteger(entry.when) ||
      (i > 0 && entry.when <= journal.entries[i - 1].when),
  )
)
  throw new Error('Migration journal times must be strictly increasing.');
const migrations = journal.entries.map((entry) => {
  const sql = readFileSync(resolve(folder, `${entry.tag}.sql`), 'utf8');
  return {
    ...entry,
    sql,
    hash: createHash('sha256').update(sql).digest('hex'),
  };
});
const baseline = JSON.parse(
  readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'),
) as { hash: string; catalog: Record<string, unknown[]> };
if (migrations[0]?.hash !== baseline.hash)
  throw new Error(
    'The immutable current baseline does not match its structural contract.',
  );
const client = new Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
  connectionTimeoutMillis: 10000,
});
await client.connect();
try {
  await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
  await client.query(
    "SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s'; SET LOCAL search_path = pg_catalog, public",
  );
  if (apply) await client.query('SELECT pg_advisory_xact_lock(736192, 36)');
  const otherLedgers = await client.query(
    `SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND (c.relname ILIKE '%migrat%' OR n.nspname IN ('drizzle','_drizzle')) AND NOT (n.nspname='_drizzle' AND c.relname='_mvp_migrations')`,
  );
  if (otherLedgers.rowCount)
    throw new Error(
      'Unrecognized migration ledger; reconcile its history explicitly before proceeding.',
    );
  const ledgerExists = (
    await client.query(`SELECT to_regclass('_drizzle._mvp_migrations') AS name`)
  ).rows[0].name;
  if (ledgerExists) {
    const columns = (
      await client.query(
        `SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='_drizzle' AND table_name='_mvp_migrations' ORDER BY column_name`,
      )
    ).rows;
    if (
      !isDeepStrictEqual(columns, [
        { column_name: 'created_at', data_type: 'bigint', is_nullable: 'NO' },
        { column_name: 'hash', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
      ])
    )
      throw new Error('Unrecognized migration ledger layout.');
  }
  const ledger = ledgerExists
    ? (
        await client.query(
          'SELECT hash, created_at FROM _drizzle._mvp_migrations ORDER BY id',
        )
      ).rows
    : [];
  if (
    ledger.length > migrations.length ||
    ledger.some(
      (row, i) =>
        row.hash !== migrations[i].hash ||
        String(row.created_at) !== String(migrations[i].when),
    )
  ) {
    throw new Error(
      'Migration ledger is not an exact prefix of the checked-in sequence.',
    );
  }
  const catalog = await readCatalog(client);
  const empty = Object.values(catalog).every((objects) => objects.length === 0);
  if (ledger.length <= 1 && !(empty && ledger.length === 0)) {
    const differences = Object.keys(baseline.catalog).filter(
      (key) => !isDeepStrictEqual(catalog[key], baseline.catalog[key]),
    );
    if (differences.length)
      throw new Error(
        `Unsupported schema; baseline differs in: ${differences.join(', ')}. No corrections were inferred.`,
      );
  }
  if (
    !(
      await client.query(
        "SELECT to_regprocedure('public.uuid_generate_v7()') AS generator",
      )
    ).rows[0].generator
  )
    throw new Error(
      'The public.uuid_generate_v7() prerequisite is missing; provision pg_uuidv7 separately.',
    );
  const uuid = await client.query(
    `SELECT public.uuid_generate_v7()::text AS id`,
  );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      uuid.rows[0].id,
    )
  )
    throw new Error('public.uuid_generate_v7() must produce UUIDv7 values.');
  const pending = migrations.slice(ledger.length);
  const action =
    pending.length === 0
      ? 'none'
      : ledger.length
        ? 'migrate'
        : empty
          ? 'create'
          : 'adopt';
  if (apply && pending.length) {
    await client.query('CREATE SCHEMA IF NOT EXISTS _drizzle');
    await client.query(
      'CREATE TABLE IF NOT EXISTS _drizzle._mvp_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL)',
    );
    for (const migration of pending) {
      if (!(action === 'adopt' && migration === migrations[0])) {
        for (const statement of migration.sql.split('--> statement-breakpoint'))
          await client.query(statement);
      }
      await client.query(
        'INSERT INTO _drizzle._mvp_migrations (hash, created_at) VALUES ($1, $2)',
        [migration.hash, migration.when],
      );
    }
  }
  await client.query('COMMIT');
  console.log(
    JSON.stringify({
      action,
      applied: apply,
      pending: pending.map((m) => m.tag),
    }),
  );
} catch (error) {
  await client.query('ROLLBACK');
  console.error(
    error instanceof Error
      ? error.message
      : 'Migration failed; transaction rolled back.',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
