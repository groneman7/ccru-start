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
const rootId = '01930000-0000-7000-8000-000000000301';
const childId = '01930000-0000-7000-8000-000000000302';
beforeAll(async () => {
  cluster = await startPostgres();
  prior = mkdtempSync(join(tmpdir(), 'ccru-before-catalog-'));
  cpSync('drizzle/mvp', prior, { recursive: true });
  const path = join(prior, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 7);
  writeFileSync(path, JSON.stringify(journal));
}, 30000);
afterAll(() => {
  cluster?.stop();
  if (prior) rmSync(prior, { recursive: true, force: true });
});
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
async function records(client: Client) {
  const tables = (
    await client.query(
      "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' AND table_name NOT IN ('comments','notifications','notification_recipients','user_certifications') ORDER BY 1,2",
    )
  ).rows;
  const output: Record<string, unknown> = {};
  for (const t of tables)
    output[`${t.table_schema}.${t.table_name}`] = (
      await client.query(
        `SELECT ${t.table_schema === 'authz' && t.table_name === 'certifications' ? "to_jsonb(t)-'deleted_at'" : 'to_jsonb(t)'} AS data FROM "${t.table_schema}"."${t.table_name}" t ORDER BY id`,
      )
    ).rows;
  return output;
}
test('catalog expansion preserves all thirteen existing tables and is repeatable', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url, prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const before = await records(client);
    expect(Object.keys(before)).toHaveLength(13);
    await apply(url);
    expect(await records(client)).toEqual(before);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS deleted FROM authz.certifications WHERE deleted_at IS NOT NULL',
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
test('pre-existing cycles reject the migration without changing rows or recording history', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url, prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await client.query('UPDATE authz.certifications SET parent=id');
    const before = await records(client);
    await expect(apply(url)).rejects.toThrow(
      'Existing certification hierarchy contains a cycle',
    );
    expect(await records(client)).toEqual(before);
    expect(
      (
        await client.query(
          "SELECT count(*)::int AS added FROM information_schema.columns WHERE table_schema='authz' AND table_name='certifications' AND column_name='deleted_at'",
        )
      ).rows,
    ).toEqual([{ added: 0 }]);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS entries FROM _drizzle._mvp_migrations',
        )
      ).rows,
    ).toEqual([{ entries: 7 }]);
  } finally {
    await client.end();
  }
}, 30000);
test('deleted child references are retained, cannot be restored under a deleted parent, and cannot be physically removed', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await client.query(
      "INSERT INTO authz.certifications (id,name,display) VALUES ($1,'Root test','Root test')",
      [rootId],
    );
    await client.query(
      "INSERT INTO authz.certifications (id,name,display,parent) VALUES ($1,'Child','Child',$2)",
      [childId, rootId],
    );
    await client.query(
      'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
      [childId],
    );
    await client.query(
      'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
      [rootId],
    );
    expect(
      (
        await client.query(
          'SELECT id,parent,deleted_at IS NOT NULL AS deleted FROM authz.certifications WHERE id IN ($1,$2) ORDER BY id',
          [rootId, childId],
        )
      ).rows,
    ).toEqual([
      { id: rootId, parent: null, deleted: true },
      { id: childId, parent: rootId, deleted: true },
    ]);
    await expect(
      client.query(
        'UPDATE authz.certifications SET deleted_at=NULL WHERE id=$1',
        [childId],
      ),
    ).rejects.toThrow('Parent certification is deleted or does not exist');
    await expect(
      client.query('DELETE FROM authz.certifications WHERE id=$1', [childId]),
    ).rejects.toThrow('Certification definitions are retained');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await expect(
      client.query(
        'UPDATE authz.certifications SET display=display WHERE id=$1',
        [childId],
      ),
    ).rejects.toThrow('Catalog changes require Read Committed isolation');
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}, 30000);
test.each(['cycle', 'child first', 'deletion first'])(
  'concurrent catalog edits preserve integrity: %s',
  async (scenario) => {
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
        "INSERT INTO authz.certifications (id,name,display) VALUES ($1,'Root test','Root test')",
        [rootId],
      );
      if (scenario === 'cycle')
        await client.query(
          "INSERT INTO authz.certifications (id,name,display) VALUES ($1,'Other','Other')",
          [childId],
        );
      await client.query('BEGIN');
      if (scenario === 'cycle')
        await client.query(
          'UPDATE authz.certifications SET parent=$1 WHERE id=$2',
          [childId, rootId],
        );
      else if (scenario === 'child first')
        await client.query(
          "INSERT INTO authz.certifications (id,name,display,parent) VALUES ($1,'Child','Child',$2)",
          [childId, rootId],
        );
      else
        await client.query(
          'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
          [rootId],
        );
      pending =
        scenario === 'cycle'
          ? other.query(
              'UPDATE authz.certifications SET parent=$1 WHERE id=$2',
              [rootId, childId],
            )
          : scenario === 'child first'
            ? other.query(
                'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
                [rootId],
              )
            : other.query(
                "INSERT INTO authz.certifications (id,name,display,parent) VALUES ($1,'Child','Child',$2)",
                [childId, rootId],
              );
      pending.catch(() => {});
      const deadline = Date.now() + 2500;
      let waiting = false;
      while (Date.now() < deadline) {
        if (
          (
            await observer.query(
              "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()",
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
        scenario === 'cycle'
          ? 'Certification hierarchy cannot contain a cycle'
          : scenario === 'child first'
            ? 'Certification has non-deleted children'
            : 'Parent certification is deleted or does not exist',
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
