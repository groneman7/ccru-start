import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let fixture: Awaited<ReturnType<typeof cluster.database>>;
let app: Awaited<ReturnType<typeof startApplication>>;
let admin: string;
let clockDirectory: string;
let clockFile: string;
const setClock = (value: string) =>
  writeFileSync(clockFile, String(Date.parse(value)));
beforeAll(async () => {
  cluster = await startPostgres();
  fixture = await cluster.database();
  await promisify(execFile)(
    process.execPath,
    ['--import', 'tsx', 'scripts/db/migrate.ts', '--apply'],
    { env: { ...process.env, MIGRATION_DATABASE_URL: fixture.url } },
  );
  await fixture.client.query(
    readFileSync('tests/support/retained.sql', 'utf8'),
  );
  await fixture.client
    .query(`UPDATE "better-auth"."user" SET status='active' WHERE role='Administrator';
    INSERT INTO "better-auth".account (account_id,provider_id,user_id,password,updated_at)
    SELECT u.id::text,'credential',u.id::text,a.password,now() FROM "better-auth"."user" u CROSS JOIN "better-auth".account a
    WHERE a.provider_id='credential' AND u.id::text<>a.user_id`);
  await fixture.client.query(
    readFileSync('tests/support/ready-identities.sql', 'utf8'),
  );
  clockDirectory = mkdtempSync(join(tmpdir(), 'ccru-event-clock-'));
  clockFile = join(clockDirectory, 'now');
  setClock('2030-01-15T13:00:00Z');
  app = await startApplication(fixture.url, {
    CCRU_TEST_NOW_FILE: clockFile,
    TZ: 'Pacific/Honolulu',
  });
  admin = await signIn(app.baseURL, 'admin@example.invalid');
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
  if (clockDirectory) rmSync(clockDirectory, { recursive: true, force: true });
});
const event = <T = any>(action: string, data?: unknown, cookie = admin) =>
  operation<T>(app.baseURL, 'calendar', 'eventServerFns', action, data, cookie);
const userId = '01930000-0000-7000-8000-000000000001';
const details = {
  name: 'Public clinic',
  description: 'Community event',
  location: null,
  timeBegin: '2030-01-15T14:00:00Z',
  timeEnd: '2030-01-15T16:00:00Z',
  createdBy: null,
};
test('event creation requires a positive same-New-York-date window with an explicit end', async () => {
  for (const times of [
    { timeEnd: null },
    { timeEnd: undefined },
    { timeEnd: details.timeBegin },
    { timeEnd: '2030-01-15T13:00:00Z' },
    { timeBegin: '2030-01-16T04:00:00Z', timeEnd: '2030-01-16T06:00:00Z' },
    { timeBegin: 'not a date' },
  ])
    expect(await event('create', { ...details, ...times })).toMatchObject({
      ok: false,
    });
  expect(await event('create', details)).toMatchObject({
    ok: true,
    value: { id: expect.any(String) },
  });
});

const publicEvents = (action: string, data?: unknown) =>
  operation<any>(app.baseURL, 'calendar', 'publicEventServerFns', action, data);
test('public responses expose only permitted event details and disappear exactly at end', async () => {
  const created = await event('create', {
    ...details,
    name: 'Boundary clinic',
  });
  const eventId = created.value.id;
  for (const [now, phase] of [
    ['2030-01-15T13:59:59.999Z', 'upcoming'],
    ['2030-01-15T14:00:00Z', 'in-progress'],
    ['2030-01-15T15:59:59.999Z', 'in-progress'],
  ]) {
    setClock(now);
    expect(await event('byId', { eventId })).toMatchObject({
      ok: true,
      value: { phase },
    });
    const detail = await publicEvents('byId', { eventId });
    expect(detail.ok).toBe(true);
    expect(Object.keys(detail.value).sort()).toEqual([
      'description',
      'id',
      'location',
      'name',
      'timeBegin',
      'timeEnd',
    ]);
    expect(detail.value).toMatchObject({
      id: eventId,
      name: 'Boundary clinic',
    });
    expect(await publicEvents('list')).toMatchObject({
      ok: true,
      value: expect.arrayContaining([expect.objectContaining({ id: eventId })]),
    });
  }
  setClock('2030-01-15T16:00:00Z');
  expect(await event('byId', { eventId })).toMatchObject({
    ok: true,
    value: { phase: 'past' },
  });
  expect(await publicEvents('byId', { eventId })).toMatchObject({
    ok: true,
    value: null,
  });
  const listing = await publicEvents('list');
  expect(listing.value.some((row: any) => row.id === eventId)).toBe(false);
});

test('cancelled and deleted events have no public payload or route, and public pages omit private relationships', async () => {
  setClock('2030-01-15T13:00:00Z');
  const ids = [];
  for (const name of [
    'Visible public clinic',
    'Cancelled secret clinic',
    'Deleted secret clinic',
  ]) {
    const created = await event('create', { ...details, name });
    ids.push(created.value.id);
  }
  await fixture.client.query(
    `UPDATE calendar.events SET cancelled_at=now() WHERE id=$1`,
    [ids[1]],
  );
  await fixture.client.query(
    `UPDATE calendar.events SET deleted_at=now() WHERE id=$1`,
    [ids[2]],
  );
  await fixture.client.query(
    `UPDATE calendar.events SET location='{"name":"Public venue","line1":"1 Clinic Way","city":"Town","state":"NY","zip":"00000","internalContact":"Hidden private contact"}'::jsonb WHERE id=$1`,
    [ids[0]],
  );
  const listed = await publicEvents('list');
  expect(listed.value.map((row: any) => row.id)).toContain(ids[0]);
  expect(listed.value.map((row: any) => row.id)).not.toContain(ids[1]);
  expect(listed.value.map((row: any) => row.id)).not.toContain(ids[2]);
  expect(JSON.stringify(listed)).not.toContain('internalContact');
  for (const eventId of [
    ids[1],
    ids[2],
    '01930000-0000-7000-8000-000000000999',
  ]) {
    expect(await publicEvents('byId', { eventId })).toMatchObject({
      ok: true,
      value: null,
    });
    const response = await fetch(`${app.baseURL}/events/${eventId}`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toMatch(
      /Cancelled secret clinic|Deleted secret clinic|Fixture User/,
    );
  }
  for (const path of ['/events', `/events/${ids[0]}`]) {
    const response = await fetch(app.baseURL + path);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const html = await response.text();
    expect(html).toContain('Visible public clinic');
    expect(html).toContain('9:00 AM EST');
    expect(html).not.toMatch(
      /Fixture User|Hidden private contact|Cancelled secret clinic|Deleted secret clinic|createdBy|userTypeId/,
    );
  }
  expect((await fetch(`${app.baseURL}/events/not-an-event-id`)).status).toBe(
    404,
  );
  setClock('2030-01-15T16:00:00Z');
  const ended = await fetch(`${app.baseURL}/events/${ids[0]}`);
  expect(ended.status).toBe(404);
  expect(await ended.text()).not.toContain('Visible public clinic');
});

test('schedulers edit past events without a deadline and partial updates enforce the combined time range', async () => {
  const eventId = '01930000-0000-7000-8000-000000000301';
  setClock('2030-01-15T13:00:00Z');
  expect(
    await event('update', {
      eventId,
      data: { name: 'Past clinic corrected', description: 'Still editable' },
    }),
  ).toMatchObject({ ok: true });
  expect(await event('byId', { eventId })).toMatchObject({
    ok: true,
    value: { name: 'Past clinic corrected', phase: 'past' },
  });
  expect(
    await event('update', {
      eventId,
      data: { timeEnd: '2026-01-10T13:00:00Z' },
    }),
  ).toMatchObject({
    ok: false,
    error: expect.stringContaining('same America/New_York date'),
  });
  const unchanged = await event('byId', { eventId });
  expect(unchanged.ok).toBe(true);
  expect(Date.parse(unchanged.value.timeEnd)).toBe(
    Date.parse('2026-01-10T16:00:00Z'),
  );
  const volunteer = await signIn(app.baseURL, 'user@example.invalid');
  expect(
    await event(
      'update',
      { eventId, data: { name: 'Unauthorized' } },
      volunteer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  expect(await event('create', details, volunteer)).toMatchObject({
    ok: false,
    error: 'Forbidden',
  });
  expect(await event('byId', { eventId }, '')).toMatchObject({
    ok: false,
    error: 'Unauthorized',
  });
});

test('offset instants and template copies use New York dates independently of the server host timezone', async () => {
  const templateId = '01930000-0000-7000-8000-000000000601';
  for (const [date, expectedBegin, expectedEnd] of [
    ['2030-01-20', '2030-01-20T14:00:00Z', '2030-01-20T16:00:00Z'],
    ['2030-07-20', '2030-07-20T13:00:00Z', '2030-07-20T15:00:00Z'],
  ]) {
    const result = await event('createFromTemplate', {
      templateId,
      date,
      createdBy: userId,
    });
    expect(result.ok).toBe(true);
    const copied = await event('byId', { eventId: result.value.id });
    expect(Date.parse(copied.value.timeBegin)).toBe(Date.parse(expectedBegin));
    expect(Date.parse(copied.value.timeEnd)).toBe(Date.parse(expectedEnd));
  }
  const valid = await event('create', {
    ...details,
    timeBegin: '2030-01-15T23:00:00Z',
    timeEnd: '2030-01-16T01:00:00Z',
  });
  expect(valid.ok).toBe(true);
  const fall = await event('create', {
    ...details,
    timeBegin: '2030-11-03T01:45:00-04:00',
    timeEnd: '2030-11-03T01:15:00-05:00',
  });
  expect(fall.ok).toBe(true);
  expect(
    await event('create', {
      ...details,
      timeBegin: '2030-01-15T09:00:00',
      timeEnd: '2030-01-15T11:00:00',
    }),
  ).toMatchObject({ ok: false });
  await fixture.client.query(
    'UPDATE calendar.templates SET time_end=NULL WHERE id=$1',
    [templateId],
  );
  expect(
    await event('createFromTemplate', {
      templateId,
      date: '2030-01-20',
      createdBy: userId,
    }),
  ).toMatchObject({
    ok: false,
    error: expect.stringContaining('Template needs valid start and end'),
  });
});

test('past event views read current related positions without snapshots', async () => {
  const positionId = '01930000-0000-7000-8000-000000000201';
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'update',
      { positionId, data: { display: 'Current position name' } },
      admin,
    ),
  ).toMatchObject({ ok: true });
  const result = await operation<any[]>(
    app.baseURL,
    'calendar',
    'slotServerFns',
    'byEventId',
    { eventId: '01930000-0000-7000-8000-000000000301' },
    admin,
  );
  expect(result).toMatchObject({
    ok: true,
    value: expect.arrayContaining([
      expect.objectContaining({
        position: expect.objectContaining({ display: 'Current position name' }),
      }),
    ]),
  });
});
