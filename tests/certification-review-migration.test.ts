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
const userId = '01930000-0000-7000-8000-000000000001';
const certId = '01930000-0000-7000-8000-000000000112';
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
  prior = mkdtempSync(join(tmpdir(), 'ccru-before-reviews-'));
  cpSync('drizzle/mvp', prior, { recursive: true });
  const path = join(prior, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 8);
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
const create = (client: Client) =>
  client.query(
    "SELECT authz.write_user_certification($1,$1,NULL,$2,'submit',NULL,NULL) AS id",
    [userId, certId],
  );
test('review migration preserves all thirteen prior tables and creates no inferred links or deliveries', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url, prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const tables = (
      await client.query(
        "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2",
      )
    ).rows;
    async function records() {
      const result: unknown[] = [];
      for (const table of tables)
        result.push(
          (
            await client.query(
              `SELECT to_jsonb(t) AS data FROM "${table.table_schema}"."${table.table_name}" t ORDER BY id`,
            )
          ).rows,
        );
      return result;
    }
    const before = await records();
    expect(tables).toHaveLength(13);
    await apply(url);
    expect(await records()).toEqual(before);
    for (const name of [
      'user_certifications',
      'notifications',
      'notification_recipients',
      'comments',
    ])
      expect(
        (await client.query(`SELECT count(*)::int AS count FROM authz.${name}`))
          .rows,
      ).toEqual([{ count: 0 }]);
    expect(JSON.parse((await apply(url)).stdout)).toMatchObject({
      action: 'none',
      pending: [],
    });
  } finally {
    await client.end();
  }
}, 30000);
test('notification failure rolls back the entire decision, comment and review resolution', async () => {
  const { client } = await seed();
  try {
    const id = (await create(client)).rows[0].id;
    await client.query(`CREATE FUNCTION public.fail_test_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fixture delivery failure'; END $$;
      CREATE TRIGGER fail_test_delivery BEFORE INSERT ON authz.notifications FOR EACH ROW WHEN (NEW.kind='certification-rejected') EXECUTE FUNCTION public.fail_test_delivery()`);
    await expect(
      client.query(
        "SELECT authz.write_user_certification($1,NULL,$2,NULL,'reject',1,'Retained comment')",
        [userId, id],
      ),
    ).rejects.toThrow('Fixture delivery failure');
    expect(
      (
        await client.query(
          'SELECT status,version,review_comment_id FROM authz.user_certifications WHERE id=$1',
          [id],
        )
      ).rows,
    ).toEqual([{ status: 'pending', version: 1, review_comment_id: null }]);
    expect(
      (await client.query('SELECT count(*)::int AS count FROM authz.comments'))
        .rows,
    ).toEqual([{ count: 0 }]);
    expect(
      (await client.query('SELECT kind,resolved_at FROM authz.notifications'))
        .rows,
    ).toEqual([{ kind: 'certification-review', resolved_at: null }]);
  } finally {
    await client.end();
  }
}, 30000);
test('delivered content survives replaced comments, and records reject physical deletion or unsafe restoration', async () => {
  const { client } = await seed();
  try {
    const id = (await create(client)).rows[0].id;
    await client.query(
      "SELECT authz.write_user_certification($1,NULL,$2,NULL,'reject',1,'Original comment')",
      [userId, id],
    );
    const delivered = (
      await client.query(
        "SELECT id,body FROM authz.notifications WHERE kind='certification-rejected'",
      )
    ).rows[0];
    const comment = (
      await client.query(
        'SELECT review_comment_id AS id FROM authz.user_certifications WHERE id=$1',
        [id],
      )
    ).rows[0].id;
    await client.query(
      "SELECT authz.write_user_certification($1,NULL,$2,$3,'edit',2,NULL)",
      [userId, id, certId],
    );
    expect(
      (
        await client.query(
          'SELECT deleted_at IS NOT NULL AS deleted FROM authz.comments WHERE id=$1',
          [comment],
        )
      ).rows,
    ).toEqual([{ deleted: true }]);
    expect(
      (
        await client.query('SELECT body FROM authz.notifications WHERE id=$1', [
          delivered.id,
        ])
      ).rows,
    ).toEqual([{ body: delivered.body }]);
    await expect(
      client.query("UPDATE authz.notifications SET body='Rewritten'"),
    ).rejects.toThrow('Delivered notification content is immutable');
    await expect(client.query('DELETE FROM authz.comments')).rejects.toThrow(
      'Inbox and comment records are retained',
    );
    await expect(
      client.query('DELETE FROM authz.notifications'),
    ).rejects.toThrow('Inbox and comment records are retained');
    await expect(
      client.query('DELETE FROM authz.user_certifications'),
    ).rejects.toThrow('User certifications are retained');
    await client.query(
      "SELECT authz.write_user_certification($1,NULL,$2,NULL,'withdraw',3,NULL)",
      [userId, id],
    );
    await client.query(
      'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
      [certId],
    );
    await expect(
      client.query(
        'UPDATE authz.user_certifications SET deleted_at=NULL WHERE id=$1',
        [id],
      ),
    ).rejects.toThrow('Certification is deleted or does not exist');
    expect(
      (
        await client.query(
          'SELECT certification_id,deleted_at IS NOT NULL AS deleted FROM authz.user_certifications WHERE id=$1',
          [id],
        )
      ).rows,
    ).toEqual([{ certification_id: certId, deleted: true }]);
  } finally {
    await client.end();
  }
}, 30000);
test.each(['link first', 'catalog deletion first'])(
  'catalog links serialize with deletion: %s',
  async (order) => {
    const { url, client } = await seed();
    const other = new Client({ connectionString: url });
    const observer = new Client({ connectionString: url });
    let pending: Promise<unknown> | undefined;
    try {
      await other.connect();
      await observer.connect();
      await client.query('BEGIN');
      if (order === 'link first') await create(client);
      else
        await client.query(
          'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
          [certId],
        );
      pending =
        order === 'link first'
          ? other.query(
              'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
              [certId],
            )
          : create(other);
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
        order === 'link first'
          ? 'Certification has non-deleted user records'
          : 'Certification is deleted or does not exist',
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
test('two simultaneous decisions produce one winner and one version conflict', async () => {
  const { url, client } = await seed();
  const other = new Client({ connectionString: url });
  const observer = new Client({ connectionString: url });
  let pending: Promise<unknown> | undefined;
  try {
    await other.connect();
    await observer.connect();
    const id = (await create(client)).rows[0].id;
    await client.query('BEGIN');
    await client.query(
      "SELECT authz.write_user_certification($1,NULL,$2,NULL,'approve',1,NULL)",
      [userId, id],
    );
    pending = other.query(
      "SELECT authz.write_user_certification($1,NULL,$2,NULL,'reject',1,'Too late')",
      [userId, id],
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
      'Submission changed; refresh before trying again',
    );
    expect(
      (
        await client.query(
          'SELECT status,version FROM authz.user_certifications WHERE id=$1',
          [id],
        )
      ).rows,
    ).toEqual([{ status: 'verified', version: 2 }]);
    expect(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM authz.notifications WHERE kind='certification-rejected'",
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
  } finally {
    await client.query('ROLLBACK');
    await Promise.allSettled([pending].filter(Boolean));
    await observer.end();
    await other.end();
    await client.end();
  }
}, 30000);
