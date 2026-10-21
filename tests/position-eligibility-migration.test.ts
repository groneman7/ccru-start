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
const cert = '01930000-0000-7000-8000-000000000112';
const position = '01930000-0000-7000-8000-000000000201';
const expression = JSON.stringify({
  version: 1,
  root: { type: 'certification', certificationId: cert, match: 'exact' },
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
beforeAll(async () => {
  cluster = await startPostgres();
  prior = mkdtempSync(join(tmpdir(), 'ccru-before-eligibility-'));
  cpSync('drizzle/mvp', prior, { recursive: true });
  const path = join(prior, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 10);
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
test('eligibility expansion preserves all seventeen business tables and defaults to unrestricted positions', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url, prior);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    const tables = (
      await client.query(
        "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2",
      )
    ).rows;
    const records = async () => {
      const result = [];
      for (const t of tables)
        result.push(
          (
            await client.query(
              `SELECT to_jsonb(t)-'cancelled_at'-'eligibility_expression'-'deleted_at' AS row FROM "${t.table_schema}"."${t.table_name}" t ORDER BY id`,
            )
          ).rows,
        );
      return result;
    };
    const before = await records();
    expect(tables).toHaveLength(17);
    await apply(url);
    expect(await records()).toEqual(before);
    expect(
      (
        await client.query(
          'SELECT eligibility_expression,deleted_at FROM calendar.positions',
        )
      ).rows,
    ).toEqual([{ eligibility_expression: null, deleted_at: null }]);
    expect(JSON.parse((await apply(url)).stdout)).toMatchObject({
      action: 'none',
      pending: [],
    });
  } finally {
    await client.end();
  }
}, 30000);
test('database rejects invalid language and live references, but retains deleted-position references', async () => {
  const { client } = await seed();
  try {
    for (const root of [
      { type: 'not', children: [] },
      { type: 'and', children: [] },
      { type: 'minimum-role', role: 'User', exact: true },
      {
        type: 'certification',
        certificationId: '01930000-0000-7000-8000-000000000999',
        match: 'exact',
      },
    ])
      await expect(
        client.query(
          'UPDATE calendar.positions SET eligibility_expression=$1 WHERE id=$2',
          [JSON.stringify({ version: 1, root }), position],
        ),
      ).rejects.toThrow();
    await client.query(
      'UPDATE calendar.positions SET eligibility_expression=$1 WHERE id=$2',
      [expression, position],
    );
    await expect(
      client.query(
        'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
        [cert],
      ),
    ).rejects.toThrow('non-deleted position requirements');
    await client.query(
      'UPDATE calendar.positions SET deleted_at=now() WHERE id=$1',
      [position],
    );
    await client.query(
      'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
      [cert],
    );
    expect(
      (
        await client.query(
          `SELECT c.display,p.eligibility_expression FROM calendar.positions p JOIN authz.certifications c ON c.id=(p.eligibility_expression->'root'->>'certificationId')::uuid WHERE p.id=$1`,
          [position],
        )
      ).rows,
    ).toEqual([
      { display: 'Child', eligibility_expression: JSON.parse(expression) },
    ]);
    await expect(
      client.query(
        'UPDATE calendar.positions SET deleted_at=NULL WHERE id=$1',
        [position],
      ),
    ).rejects.toThrow('Requirement certification is deleted');
    await expect(
      client.query('DELETE FROM calendar.positions WHERE id=$1', [position]),
    ).rejects.toThrow('Positions are retained');
  } finally {
    await client.end();
  }
});
async function waitBlocked(client: Client, pid: number) {
  for (let i = 0; i < 100; i++) {
    if (
      (
        await client.query(
          'SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',
          [pid],
        )
      ).rows[0]?.wait_event_type === 'Lock'
    )
      return;
    await pause(10);
  }
  throw new Error('Expected mutation to wait for catalog lock');
}
for (const deletionFirst of [false, true])
  test(`catalog deletion and position authoring serialize (${deletionFirst ? 'delete' : 'expression'} first)`, async () => {
    const { url, client } = await seed();
    const other = new Client({ connectionString: url });
    const observer = new Client({ connectionString: url });
    await other.connect();
    await observer.connect();
    try {
      await client.query('BEGIN');
      const save = (connection: Client) =>
        connection.query(
          'UPDATE calendar.positions SET eligibility_expression=$1 WHERE id=$2',
          [expression, position],
        );
      const remove = (connection: Client) =>
        connection.query(
          'UPDATE authz.certifications SET deleted_at=now() WHERE id=$1',
          [cert],
        );
      await (deletionFirst ? remove(client) : save(client));
      const pid = (await other.query('SELECT pg_backend_pid() AS pid')).rows[0]
        .pid;
      const waiting = (deletionFirst ? save(other) : remove(other)).then(
        () => null,
        (error) => error,
      );
      await waitBlocked(observer, pid);
      await client.query('COMMIT');
      expect((await waiting)?.message).toContain(
        deletionFirst
          ? 'Requirement certification is deleted'
          : 'non-deleted position requirements',
      );
    } finally {
      await client.query('ROLLBACK');
      await other.end();
      await observer.end();
      await client.end();
    }
  });
