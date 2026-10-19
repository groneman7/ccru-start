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

const execute = promisify(execFile);
let cluster: Awaited<ReturnType<typeof startPostgres>>;
let folder: string;
beforeAll(async () => {
  cluster = await startPostgres();
  folder = mkdtempSync(join(tmpdir(), 'ccru-authority-sequence-'));
  cpSync('drizzle/mvp', folder, { recursive: true });
  const path = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 2);
  writeFileSync(path, JSON.stringify(journal));
}, 30000);
afterAll(() => {
  cluster?.stop();
  if (folder) rmSync(folder, { recursive: true, force: true });
});
async function apply(url: string) {
  return execute(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/db/migrate.ts',
      '--apply',
      '--migrations',
      folder,
    ],
    { env: { ...process.env, MIGRATION_DATABASE_URL: url } },
  );
}
test('authority expansion preserves every existing role and status and grants no implicit Officer capabilities', async () => {
  const { url, client } = await cluster.database();
  try {
    await client.query(
      readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
    );
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const before = (
      await client.query(
        'SELECT to_jsonb(u) AS data FROM "better-auth"."user" u ORDER BY id',
      )
    ).rows;
    await apply(url);
    expect(
      (
        await client.query(
          `SELECT to_jsonb(u) - 'can_manage_scheduling' - 'can_manage_users' AS data FROM "better-auth"."user" u ORDER BY id`,
        )
      ).rows,
    ).toEqual(before);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM "better-auth"."user" WHERE can_manage_scheduling OR can_manage_users',
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
    await expect(
      client.query(
        `UPDATE "better-auth"."user" SET can_manage_users=true WHERE role='User'`,
      ),
    ).rejects.toThrow('officer_capabilities_only');
  } finally {
    await client.end();
  }
}, 30000);
test.each([null, 'Custom', 'User,Developer'])(
  'rejects unsupported retained role %s without replacing existing values',
  async (role) => {
    const { url, client } = await cluster.database();
    try {
      await client.query(
        readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
      );
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      await client.query(
        'UPDATE "better-auth"."user" SET role=$1 WHERE id=$2',
        [role, '01930000-0000-7000-8000-000000000001'],
      );
      const before = (
        await client.query(
          'SELECT id,role,status FROM "better-auth"."user" ORDER BY id',
        )
      ).rows;
      await expect(apply(url)).rejects.toThrow();
      expect(
        (
          await client.query(
            'SELECT id,role,status FROM "better-auth"."user" ORDER BY id',
          )
        ).rows,
      ).toEqual(before);
      expect(
        (
          await client.query(
            "SELECT to_regclass('_drizzle._mvp_migrations') AS ledger",
          )
        ).rows,
      ).toEqual([{ ledger: null }]);
    } finally {
      await client.end();
    }
  },
  30000,
);
