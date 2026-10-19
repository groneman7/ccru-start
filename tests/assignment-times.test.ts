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
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

const execute = promisify(execFile);
let cluster: Awaited<ReturnType<typeof startPostgres>>;
let expansion: string;
beforeAll(async () => {
  cluster = await startPostgres();
  expansion = mkdtempSync(join(tmpdir(), 'ccru-assignment-expand-'));
  cpSync('drizzle/mvp', expansion, { recursive: true });
  const path = join(expansion, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  journal.entries = journal.entries.slice(0, 3);
  writeFileSync(path, JSON.stringify(journal));
}, 30000);

test('the shared write contract preserves same-event priority and resets priority across events', async () => {
  const { url, client } = await cluster.database();
  try {
    await apply(url);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await client.query(`INSERT INTO calendar.events (id,name,time_begin,created_by)
      SELECT '01930000-0000-7000-8000-000000000302', 'Other event', time_begin, created_by FROM calendar.events;
      INSERT INTO calendar.junction_shifts (id,event_id,position_id,quantity)
      SELECT '01930000-0000-7000-8000-000000000403',event_id,position_id,2 FROM calendar.junction_shifts LIMIT 1;
      INSERT INTO calendar.junction_shifts (id,event_id,position_id,quantity)
      SELECT '01930000-0000-7000-8000-000000000404','01930000-0000-7000-8000-000000000302',position_id,2 FROM calendar.junction_shifts LIMIT 1;
      UPDATE calendar.junction_slots SET assigned_at='2026-01-02 03:04:05+00' WHERE status='active'`);
    const sameEvent = (
      await client.query(`UPDATE calendar.junction_slots
      SET shift_id='01930000-0000-7000-8000-000000000403', assigned_at='2000-01-01'
      WHERE status='active' RETURNING assigned_at`)
    ).rows[0].assigned_at;
    expect(sameEvent.toISOString()).toBe('2026-01-02T03:04:05.000Z');
    const started = Date.now();
    const otherEvent = (
      await client.query(`UPDATE calendar.junction_slots
      SET shift_id='01930000-0000-7000-8000-000000000404', assigned_at='2000-01-01'
      WHERE status='active' RETURNING assigned_at`)
    ).rows[0].assigned_at;
    expect(otherEvent.getTime()).toBeGreaterThanOrEqual(started);
    expect(otherEvent.getTime()).toBeLessThanOrEqual(Date.now());
    const deleted = (
      await client.query(`UPDATE calendar.junction_slots SET status='deleted'
      WHERE id='01930000-0000-7000-8000-000000000501' RETURNING assigned_at`)
    ).rows[0].assigned_at;
    expect(deleted).toEqual(otherEvent);
    const restored = (
      await client.query(`UPDATE calendar.junction_slots SET status='active'
      WHERE id='01930000-0000-7000-8000-000000000501' RETURNING assigned_at`)
    ).rows[0].assigned_at;
    expect(restored).toEqual(otherEvent);
  } finally {
    await client.end();
  }
}, 30000);

test('the staffing UI server operations return authoritative fresh and replacement times only to schedulers', async () => {
  const { url, client } = await cluster.database();
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  try {
    await apply(url);
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await client.query(`INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at)
      SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a
      WHERE a.provider_id='credential' AND u.role='Developer'`);
    app = await startApplication(url);
    const cookie = await signIn(app.baseURL, 'developer@example.invalid');
    const command = <T>(action: string, data: unknown, actor = cookie) =>
      operation<T>(
        app!.baseURL,
        'calendar',
        'slotServerFns',
        action,
        data,
        actor,
      );
    const shiftId = '01930000-0000-7000-8000-000000000401',
      userId = '01930000-0000-7000-8000-000000000001';
    type Assignment = { id: string; assignedAt: string };
    const start = Date.now();
    const created = await command<Assignment>('create', {
      shiftId,
      userId,
      assignedAt: '2000-01-01T00:00:00Z',
    });
    expect(created, JSON.stringify(created)).toMatchObject({
      ok: true,
      value: { assignedAt: expect.any(String) },
    });
    expect(Date.parse(created.value!.assignedAt)).toBeGreaterThanOrEqual(start);
    expect(Date.parse(created.value!.assignedAt)).toBeLessThanOrEqual(
      Date.now(),
    );
    const replacingAt = Date.now();
    const replaced = await command<Assignment>('reassignUser', {
      slotId: created.value!.id,
      userId: '01930000-0000-7000-8000-000000000004',
      assignedAt: created.value!.assignedAt,
    });
    expect(replaced).toMatchObject({
      ok: true,
      value: { id: created.value!.id, assignedAt: expect.any(String) },
    });
    expect(Date.parse(replaced.value!.assignedAt)).toBeGreaterThanOrEqual(
      replacingAt,
    );
    expect(Date.parse(replaced.value!.assignedAt)).toBeGreaterThan(
      Date.parse(created.value!.assignedAt),
    );
    const repeated = await command<Assignment>('reassignUser', {
      slotId: created.value!.id,
      userId: '01930000-0000-7000-8000-000000000004',
    });
    expect(repeated).toEqual(replaced);
    const volunteer = await signIn(app.baseURL, 'user@example.invalid');
    for (const [action, data] of [
      ['create', { shiftId, userId }],
      ['reassignUser', { slotId: created.value!.id, userId }],
    ] as const)
      expect(await command(action, data, volunteer)).toMatchObject({
        ok: false,
        error: 'Forbidden',
      });
  } finally {
    await app?.stop();
    await client.end();
  }
}, 45000);
afterAll(() => {
  cluster?.stop();
  if (expansion) rmSync(expansion, { recursive: true, force: true });
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
    {
      env: { ...process.env, MIGRATION_DATABASE_URL: url },
    },
  );
}

async function retainedRows(client: Client) {
  const tables = (
    await client.query(`SELECT table_schema,table_name FROM information_schema.tables
    WHERE table_schema IN ('authz','better-auth','calendar') AND table_type='BASE TABLE' ORDER BY 1,2`)
  ).rows;
  const rows: Record<string, unknown> = {};
  for (const { table_schema, table_name } of tables) {
    rows[`${table_schema}.${table_name}`] = (
      await client.query(`SELECT
      to_jsonb(t) - 'assigned_at' - 'can_manage_scheduling' - 'can_manage_users' AS data
      FROM "${table_schema}"."${table_name}" t ORDER BY id`)
    ).rows;
  }
  return rows;
}

test('legacy priority uses UUIDv7 time, including deleted slots, without replaying historical workflows', async () => {
  const { url, client } = await cluster.database();
  try {
    await client.query(
      readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
    );
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    // Independent RFC 9562 A.6 vector, and pg_uuidv7's published example.
    await client.query(`UPDATE calendar.junction_slots SET id=CASE status
      WHEN 'active' THEN '017f22e2-79b0-7cc3-98c4-dc0c0c07398f'::uuid
      ELSE '018570bb-4a7d-7c7e-8df4-6d47afd8c8fc'::uuid END`);
    await client.query(`INSERT INTO calendar.junction_slots (id,shift_id,user_id,status)
      SELECT ('018570bb-4a7d-7c7e-8df4-' || lpad(n::text,12,'0'))::uuid,
        shift_id,user_id,'deleted' FROM calendar.junction_slots CROSS JOIN generate_series(1,13) n WHERE status='deleted'`);
    const before = await retainedRows(client);
    expect(Object.keys(before)).toHaveLength(12);
    await apply(url);
    const slots = (
      await client.query(
        `SELECT assigned_at, to_jsonb(s) - 'assigned_at' AS data FROM calendar.junction_slots s ORDER BY id`,
      )
    ).rows;
    // All 12 business tables retain their records, identities, state and links.
    // This also catches flags/review records or workflow metadata being added.
    expect(await retainedRows(client)).toEqual(before);
    expect(slots.filter(({ data }) => data.status === 'deleted')).toHaveLength(
      14,
    );
    expect(slots.map(({ assigned_at }) => assigned_at.toISOString())).toEqual([
      '2022-02-22T19:22:22.000Z',
      ...Array(14).fill('2023-01-02T04:26:40.637Z'),
    ]);
  } finally {
    await client.end();
  }
}, 30000);

test('nullable expansion protects old writers and preserves populated operation times during backfill', async () => {
  const { url, client } = await cluster.database();
  try {
    await client.query(
      readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
    );
    await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
    await apply(url, expansion);
    expect(
      (
        await client.query(`SELECT is_nullable,column_default FROM information_schema.columns
      WHERE table_schema='calendar' AND table_name='junction_slots' AND column_name='assigned_at'`)
      ).rows,
    ).toEqual([{ is_nullable: 'YES', column_default: null }]);
    expect(
      (
        await client.query(
          `SELECT assigned_at FROM calendar.junction_slots ORDER BY id`,
        )
      ).rows,
    ).toEqual([{ assigned_at: null }, { assigned_at: null }]);
    const start = Date.now();
    const changed = (
      await client.query(`UPDATE calendar.junction_slots SET user_id='01930000-0000-7000-8000-000000000004'
      WHERE status='active' RETURNING assigned_at`)
    ).rows[0].assigned_at;
    expect(changed.getTime()).toBeGreaterThanOrEqual(start);
    const inserted = (
      await client.query(`INSERT INTO calendar.junction_slots (shift_id,user_id)
      SELECT shift_id,user_id FROM calendar.junction_slots WHERE status='active' RETURNING id,assigned_at`)
    ).rows[0];
    expect(inserted.assigned_at.getTime()).toBeGreaterThanOrEqual(start);
    await apply(url);
    expect(
      (
        await client.query(
          `SELECT assigned_at FROM calendar.junction_slots WHERE status='active' ORDER BY id`,
        )
      ).rows,
    ).toEqual([
      { assigned_at: changed },
      { assigned_at: inserted.assigned_at },
    ]);
    expect(
      (
        await client.query(`SELECT is_nullable,column_default FROM information_schema.columns
      WHERE table_schema='calendar' AND table_name='junction_slots' AND column_name='assigned_at'`)
      ).rows,
    ).toEqual([{ is_nullable: 'NO', column_default: 'clock_timestamp()' }]);
    await expect(
      client.query(`UPDATE calendar.junction_slots SET assigned_at=NULL`),
    ).rejects.toThrow('not-null constraint');
  } finally {
    await client.end();
  }
}, 30000);

test.each([
  'missing helper',
  'null decoder',
  'bad version',
  'bad variant',
  'row decoding fails',
  'row decoding wrong',
  'row decoding infinite',
])(
  'backfill rejects %s visibly and rolls the entire cutover back',
  async (problem) => {
    const { url, client } = await cluster.database();
    try {
      await client.query(
        readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
      );
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      if (problem === 'missing helper')
        await client.query('DROP FUNCTION public.uuid_v7_to_timestamptz(uuid)');
      else if (problem === 'null decoder')
        await client.query(`CREATE OR REPLACE FUNCTION public.uuid_v7_to_timestamptz(id uuid)
        RETURNS timestamptz LANGUAGE SQL IMMUTABLE AS $$ SELECT NULL::timestamptz $$`);
      else if (problem === 'bad version' || problem === 'bad variant')
        await client.query(
          `UPDATE calendar.junction_slots SET id=$1 WHERE status='active'`,
          [
            problem === 'bad version'
              ? '01930000-0000-4000-8000-000000000501'
              : '01930000-0000-7000-c000-000000000501',
          ],
        );
      else
        await client.query(`CREATE OR REPLACE FUNCTION public.uuid_v7_to_timestamptz(id uuid)
        RETURNS timestamptz LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT CASE
          WHEN id='01930000-0000-7000-8000-000000000501'::uuid THEN ${
            problem === 'row decoding fails'
              ? 'NULL::timestamptz'
              : problem === 'row decoding wrong'
                ? "timestamptz '2000-01-01+00'"
                : "timestamptz 'infinity'"
          }
          ELSE to_timestamp((('x' || substr(replace(id::text,'-',''),1,12))::bit(48)::bigint)::double precision / 1000) END $$`);
      const before = await retainedRows(client);
      await expect(apply(url)).rejects.toThrow(/Assignment backfill/);
      expect(await retainedRows(client)).toEqual(before);
      expect(
        (
          await client.query(
            `SELECT to_regclass('_drizzle._mvp_migrations') AS ledger`,
          )
        ).rows,
      ).toEqual([{ ledger: null }]);
      expect(
        (
          await client.query(`SELECT count(*)::int AS count FROM information_schema.columns
        WHERE table_schema='calendar' AND table_name='junction_slots' AND column_name='assigned_at'`)
        ).rows,
      ).toEqual([{ count: 0 }]);
    } finally {
      await client.end();
    }
  },
  30000,
);

test.each(['writer first', 'migration first'])(
  'concurrent cutover preserves the replacement operation time with %s',
  async (order) => {
    const { url, client } = await cluster.database();
    const observer = new Client({ connectionString: url });
    let app: Awaited<ReturnType<typeof startApplication>> | undefined;
    let migration: ReturnType<typeof apply> | undefined;
    let replacing:
      | ReturnType<typeof operation<{ id: string; assignedAt: string }>>
      | undefined;
    try {
      await observer.connect();
      await client.query(
        readFileSync('drizzle/mvp/0000_current_baseline.sql', 'utf8'),
      );
      await client.query(readFileSync('tests/support/retained.sql', 'utf8'));
      await apply(url, expansion);
      await client.query(`INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at)
        SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a
        WHERE a.provider_id='credential' AND u.role='Developer'`);
      app = await startApplication(url);
      const cookie = await signIn(app.baseURL, 'developer@example.invalid');
      const input = {
        slotId: '01930000-0000-7000-8000-000000000501',
        userId: '01930000-0000-7000-8000-000000000004',
      };
      // Compile the real handler before holding any lock; this denied request
      // cannot alter the legacy row or its missing timestamp.
      expect(
        await operation(
          app.baseURL,
          'calendar',
          'slotServerFns',
          'reassignUser',
          input,
        ),
      ).toMatchObject({ ok: false, error: 'Unauthorized' });
      await client.query(
        'BEGIN; LOCK TABLE calendar.junction_slots IN SHARE MODE',
      );
      const waitFor = async (query: string) => {
        const deadline = Date.now() + 2500;
        while (Date.now() < deadline) {
          const waiting = await observer.query(
            `SELECT 1 FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE $1`,
            [query],
          );
          if (waiting.rowCount) return;
          await pause(20);
        }
        throw new Error(`No queued fixture operation: ${query}`);
      };
      const queueMigration = async () => {
        migration = apply(url);
        migration.catch(() => {});
        await waitFor(
          '%LOCK TABLE calendar.junction_slots IN ACCESS EXCLUSIVE MODE%',
        );
      };
      const queueWriter = async () => {
        replacing = operation<{ id: string; assignedAt: string }>(
          app!.baseURL,
          'calendar',
          'slotServerFns',
          'reassignUser',
          input,
          cookie,
        );
        replacing.catch(() => {});
        await waitFor('%update%junction_slots%');
      };
      if (order === 'writer first') {
        await queueWriter();
        await queueMigration();
      } else {
        await queueMigration();
        await queueWriter();
      }
      const releasedAt = Date.now();
      await client.query('COMMIT');
      const [changed] = await Promise.all([replacing!, migration!]);
      expect(changed, JSON.stringify(changed)).toMatchObject({
        ok: true,
        value: { assignedAt: expect.any(String) },
      });
      expect(Date.parse(changed.value!.assignedAt)).toBeGreaterThanOrEqual(
        releasedAt,
      );
      // Read through the same idempotent command after both operations finish.
      // The backfill must not replace a newly recorded owner timestamp.
      expect(
        await operation(
          app.baseURL,
          'calendar',
          'slotServerFns',
          'reassignUser',
          input,
          cookie,
        ),
      ).toEqual(changed);
      expect(
        (
          await client.query(
            'SELECT count(*)::int AS count FROM calendar.junction_slots WHERE assigned_at IS NULL',
          )
        ).rows,
      ).toEqual([{ count: 0 }]);
    } finally {
      await client.query('ROLLBACK');
      await Promise.allSettled([migration, replacing].filter(Boolean));
      await app?.stop();
      await observer.end();
      await client.end();
    }
  },
  45000,
);
