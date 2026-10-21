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
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let prior: string;
const execute = promisify(execFile);
beforeAll(async () => {
  cluster = await startPostgres();
  prior = mkdtempSync(join(tmpdir(), 'ccru-before-registration-'));
  cpSync('drizzle/mvp', prior, { recursive: true });
  const path = join(prior, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 6);
  writeFileSync(path, JSON.stringify(journal));
}, 30000);
afterAll(() => {
  cluster?.stop();
  if (prior) rmSync(prior, { recursive: true, force: true });
});
test('registration policy defaults closed and preserves every retained business row and verified identity', async () => {
  const { url, client } = await cluster.database();
  const migrate = (folder?: string) =>
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
  try {
    await migrate(prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const tables = (
      await client.query(
        "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2",
      )
    ).rows;
    async function retained() {
      const records: unknown[] = [];
      for (const table of tables)
        records.push(
          (
            await client.query(
              `SELECT to_jsonb(t) AS data FROM "${table.table_schema}"."${table.table_name}" t ORDER BY id`,
            )
          ).rows,
        );
      return records;
    }
    const before = await retained();
    expect(tables).toHaveLength(12);
    await migrate();
    expect(await retained()).toEqual(before);
    expect(
      (await client.query('SELECT * FROM authz.organization_settings')).rows,
    ).toEqual([{ id: 1, registration_mode: 'invitation-only' }]);
    expect(JSON.parse((await migrate()).stdout)).toMatchObject({
      action: 'none',
      pending: [],
    });
    await expect(
      client.query(
        "UPDATE authz.organization_settings SET registration_mode='unsupported'",
      ),
    ).rejects.toThrow();
    await expect(
      client.query('INSERT INTO authz.organization_settings (id) VALUES (2)'),
    ).rejects.toThrow();
  } finally {
    await client.end();
  }
}, 30000);
