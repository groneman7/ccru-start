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
import { setTimeout as pause } from 'node:timers/promises';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let prior: string;
const execute = promisify(execFile);
const userId = '01930000-0000-7000-8000-000000000001';
const typeId = '01930000-0000-7000-8000-000000000102';
beforeAll(async () => {
  cluster = await startPostgres();
  prior = mkdtempSync(join(tmpdir(), 'ccru-before-profile-types-'));
  cpSync('drizzle/mvp', prior, { recursive: true });
  const path = join(prior, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 5);
  writeFileSync(path, JSON.stringify(journal));
}, 30000);
afterAll(() => {
  cluster?.stop();
  if (prior) rmSync(prior, { recursive: true, force: true });
});
async function apply(url: string, folder?: string) {
  return execute(
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
}
async function records(client: Client) {
  const tables = (
    await client.query(
      `SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2`,
    )
  ).rows;
  const result: Record<string, unknown> = {};
  for (const { table_schema, table_name } of tables)
    result[`${table_schema}.${table_name}`] = (
      await client.query(
        `SELECT to_jsonb(t)-'deleted_at' AS data FROM "${table_schema}"."${table_name}" t ORDER BY id`,
      )
    ).rows;
  return result;
}
test('the forward migration preserves all business values and leaves existing records non-deleted', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url, prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const before = await records(client);
    await apply(url);
    expect(await records(client)).toEqual(before);
    expect(Object.keys(before)).toHaveLength(12);
    expect(
      (
        await client.query(
          `SELECT (SELECT count(*) FROM "better-auth"."user" WHERE deleted_at IS NOT NULL)::int + (SELECT count(*) FROM authz.user_types WHERE deleted_at IS NOT NULL)::int AS deleted`,
        )
      ).rows,
    ).toEqual([{ deleted: 0 }]);
    expect(JSON.parse((await apply(url)).stdout)).toMatchObject({
      action: 'none',
      pending: [],
    });
  } finally {
    await client.end();
  }
}, 30000);

test('only explicitly deleted profile references permit soft deletion, and restoring an invalid reference is rejected', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await client.query(
      `UPDATE "better-auth"."user" SET status='inactive' WHERE id=$1`,
      [userId],
    );
    await expect(
      client.query(
        `UPDATE authz.user_types SET deleted_at=clock_timestamp() WHERE name='volunteer'`,
      ),
    ).rejects.toThrow('User type is assigned to a non-deleted profile');
    await client.query(
      `UPDATE "better-auth"."user" SET deleted_at=clock_timestamp() WHERE id=$1`,
      [userId],
    );
    await client.query(
      `UPDATE authz.user_types SET deleted_at=clock_timestamp() WHERE name='volunteer'`,
    );
    expect(
      (
        await client.query(
          `SELECT count(*)::int AS retained FROM authz.user_types WHERE name='volunteer' AND deleted_at IS NOT NULL`,
        )
      ).rows,
    ).toEqual([{ retained: 1 }]);
    expect(
      (
        await client.query(
          `SELECT user_type_id IS NOT NULL AS retained_reference FROM "better-auth"."user" WHERE id=$1`,
          [userId],
        )
      ).rows,
    ).toEqual([{ retained_reference: true }]);
    await expect(
      client.query(
        `UPDATE "better-auth"."user" SET deleted_at=NULL WHERE id=$1`,
        [userId],
      ),
    ).rejects.toThrow('User type is deleted or does not exist');
  } finally {
    await client.end();
  }
}, 30000);

test.each(['assignment first', 'deletion first'])(
  'type assignment and soft deletion serialize safely with %s',
  async (order) => {
    const { url, client } = await cluster.database();
    const other = new Client({ connectionString: url });
    const observer = new Client({ connectionString: url });
    let pending: Promise<unknown> | undefined;
    try {
      await other.connect();
      await observer.connect();
      await apply(url);
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      await client.query(
        `INSERT INTO authz.user_types (id,name,display) VALUES ($1,'race','Race')`,
        [typeId],
      );
      await client.query('BEGIN');
      if (order === 'assignment first')
        await client.query(
          `UPDATE "better-auth"."user" SET user_type_id=$1 WHERE id=$2`,
          [typeId, userId],
        );
      else
        await client.query(
          `UPDATE authz.user_types SET deleted_at=clock_timestamp() WHERE id=$1`,
          [typeId],
        );
      pending =
        order === 'assignment first'
          ? other.query(
              `UPDATE authz.user_types SET deleted_at=clock_timestamp() WHERE id=$1`,
              [typeId],
            )
          : other.query(
              `UPDATE "better-auth"."user" SET user_type_id=$1 WHERE id=$2`,
              [typeId, userId],
            );
      pending.catch(() => {});
      const deadline = Date.now() + 2500;
      let waiting = false;
      while (Date.now() < deadline) {
        if (
          (
            await observer.query(
              `SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()`,
            )
          ).rowCount
        ) {
          waiting = true;
          break;
        }
        await pause(20);
      }
      expect(waiting).toBe(true);
      await client.query('COMMIT');
      await expect(pending).rejects.toThrow(
        order === 'assignment first'
          ? 'User type is assigned to a non-deleted profile'
          : 'User type is deleted or does not exist',
      );
      const state = (
        await client.query(
          `SELECT t.deleted_at IS NOT NULL AS deleted, u.user_type_id=$1 AS assigned FROM authz.user_types t CROSS JOIN "better-auth"."user" u WHERE t.id=$1 AND u.id=$2`,
          [typeId, userId],
        )
      ).rows[0];
      expect(state).toEqual(
        order === 'assignment first'
          ? { deleted: false, assigned: true }
          : { deleted: true, assigned: false },
      );
    } finally {
      await client.query('ROLLBACK');
      await Promise.allSettled([pending].filter(Boolean));
      await observer.end();
      await other.end();
      await client.end();
    }
  },
  30000,
);
