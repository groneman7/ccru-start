import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { startApplication } from './support/application';
import { operation, signIn } from './support/operations';
import { startPostgres } from './support/postgres';

let cluster: Awaited<ReturnType<typeof startPostgres>>;
let fixture: Awaited<ReturnType<typeof cluster.database>>;
let app: Awaited<ReturnType<typeof startApplication>>;
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
  app = await startApplication(fixture.url);
}, 30000);
afterAll(async () => {
  await app?.stop();
  await fixture?.client.end();
  cluster?.stop();
});

beforeEach(async () => {
  await fixture.client.query(
    "UPDATE authz.organization_settings SET registration_mode='invitation-only'",
  );
});
async function openRegistration() {
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'updateMode',
      { mode: 'open' },
      admin,
    ),
  ).toMatchObject({ ok: true });
}
test('invitation-only is the initial mode and blocks uninvited email registration', async () => {
  const response = await fetch(`${app.baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({
      name: 'New Volunteer',
      nameFirst: 'New',
      nameLast: 'Volunteer',
      email: 'blocked@example.invalid',
      password: 'fixture-password-36',
    }),
  });
  expect(response.status).toBe(403);
  expect(await response.text()).toContain('Contact the organization');
  expect(app.emails).toHaveLength(0);
}, 30000);

async function google(email: string, verified = true, withNames = true) {
  const initial = await post('sign-in/social', {
    provider: 'google',
    callbackURL: '/',
    errorCallbackURL: '/sign-in',
    disableRedirect: true,
  });
  expect(initial.status).toBe(200);
  const authorization = new URL((await initial.json()).url);
  const code = Buffer.from(
    JSON.stringify({
      sub: email,
      email,
      email_verified: verified,
      name: 'Google Volunteer',
      given_name: withNames ? 'Google' : undefined,
      family_name: withNames ? 'Volunteer' : undefined,
      aud: 'fixture',
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return fetch(
    `${app.baseURL}/api/auth/callback/google?code=${code}&state=${authorization.searchParams.get('state')}`,
    { headers: { cookie: cookies(initial) }, redirect: 'manual' },
  );
}
test('invitation-only also denies a new Google identity with instructions to contact the organization', async () => {
  const response = await google('closed-google@example.invalid');
  expect(response.status).toBe(302);
  expect(
    decodeURIComponent(response.headers.get('location')!).replaceAll('_', ' '),
  ).toContain('Contact the organization');
});

test('only Administrators and Developers can switch registration to open', async () => {
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'updateMode',
      { mode: 'open' },
      officer,
    ),
  ).toMatchObject({ ok: false, error: 'Forbidden' });
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'updateMode',
      { mode: 'open' },
      admin,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'getMode',
    ),
  ).toMatchObject({ ok: true, value: 'open' });
});

function post(path: string, data: unknown, cookie = '') {
  return fetch(`${app.baseURL}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      cookie,
    },
    body: JSON.stringify(data),
  });
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}
const own = (action: string, data: unknown, cookie: string) =>
  operation<any>(app.baseURL, 'users', 'userServerFns', action, data, cookie);

test('open registration gives only onboarding access until verified normalized details are complete', async () => {
  await openRegistration();
  const response = await post('sign-up/email', {
    name: 'Client fabricated display',
    nameFirst: ' New ',
    nameLast: ' Volunteer ',
    email: 'new@example.invalid',
    password: 'fixture-password-36',
    callbackURL: '/',
  });
  expect(response.status).toBe(200);
  const { user } = await response.json();
  const cookie = cookies(response);
  expect(await own('byId', { userId: user.id }, cookie)).toMatchObject({
    ok: true,
    value: {
      display: 'New Volunteer',
      status: 'invited',
      emailVerified: false,
      timestampOnboardingCompleted: null,
    },
  });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'all',
      undefined,
      cookie,
    ),
  ).toMatchObject({ ok: false });
  expect(
    await own(
      'updateOnboardingProfile',
      {
        userId: user.id,
        nameFirst: ' New ',
        nameMiddle: ' Q ',
        nameLast: ' Volunteer ',
        phoneNumber: '+1 (555) 010-0100',
        postNominals: 'MD',
      },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  expect(await own('byId', { userId: user.id }, cookie)).toMatchObject({
    ok: true,
    value: {
      display: 'New Q Volunteer',
      phoneNumber: '+15550100100',
      phoneNumberVerified: false,
    },
  });
  expect(
    await own('completeOnboarding', { userId: user.id }, cookie),
  ).toMatchObject({ ok: false });
  const message = app.emails.find(
    (email) => email.to === 'new@example.invalid',
  )!;
  expect(message.subject).toBe('Verify your email address');
  const link = new URL(message.html.match(/href="([^"]+)"/)![1]);
  expect(
    (
      await fetch(`${app.baseURL}${link.pathname}${link.search}`, {
        redirect: 'manual',
      })
    ).status,
  ).toBe(302);
  expect(
    await own('completeOnboarding', { userId: user.id }, cookie),
  ).toMatchObject({ ok: true });
  expect(await own('byId', { userId: user.id }, cookie)).toMatchObject({
    ok: true,
    value: {
      status: 'active',
      emailVerified: true,
      timestampOnboardingCompleted: expect.any(String),
    },
  });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'all',
      undefined,
      cookie,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('Google verified identity still needs normalized onboarding before scheduling', async () => {
  await openRegistration();
  const response = await google('google@example.invalid');
  expect(response.headers.get('location')).not.toContain('error=');
  const cookie = cookies(response);
  const session = await (
    await fetch(`${app.baseURL}/api/auth/get-session`, { headers: { cookie } })
  ).json();
  expect(session.user).toMatchObject({
    emailVerified: true,
    nameFirst: 'Google',
    nameLast: 'Volunteer',
    status: 'invited',
  });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'all',
      undefined,
      cookie,
    ),
  ).toMatchObject({ ok: false });
  expect(
    await own(
      'updateOnboardingProfile',
      { userId: session.user.id, phoneNumber: '+44 (20) 7946-0000' },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await own('completeOnboarding', { userId: session.user.id }, cookie),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'all',
      undefined,
      cookie,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('unverified Google claims cannot complete onboarding', async () => {
  await openRegistration();
  const response = await google('unverified-google@example.invalid', false);
  const cookie = cookies(response);
  const session = await (
    await fetch(`${app.baseURL}/api/auth/get-session`, { headers: { cookie } })
  ).json();
  expect(session.user.emailVerified).toBe(false);
  expect(
    await own(
      'updateOnboardingProfile',
      { userId: session.user.id, phoneNumber: '+15550100333' },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await own('completeOnboarding', { userId: session.user.id }, cookie),
  ).toMatchObject({ ok: false });
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'all',
      undefined,
      cookie,
    ),
  ).toMatchObject({ ok: false });
}, 30000);

test('registration pages explain closed mode and only permitted settings screens contain the switch', async () => {
  const closed = await (await fetch(`${app.baseURL}/register`)).text();
  expect(closed).toContain('Contact the organization');
  const officer = await signIn(app.baseURL, 'officer@example.invalid');
  const readonly = await (
    await fetch(`${app.baseURL}/admin/settings`, {
      headers: { cookie: officer },
    })
  ).text();
  expect(readonly).not.toContain('Save registration mode');
  const admin = await signIn(app.baseURL, 'admin@example.invalid');
  const editable = await (
    await fetch(`${app.baseURL}/admin/settings`, { headers: { cookie: admin } })
  ).text();
  expect(editable).toContain('Save registration mode');
  await openRegistration();
  const opened = await (await fetch(`${app.baseURL}/register`)).text();
  expect(opened).toContain('Sign up with Google');
  expect(opened).not.toContain('Registration is invitation-only');
}, 30000);

test('retained unverified and incomplete active accounts keep identity and status while routed to onboarding', async () => {
  const id = '01930000-0000-7000-8000-000000000001';
  await fixture.client.query(
    'UPDATE "better-auth"."user" SET email_verified=false,phone_number=NULL WHERE id=$1',
    [id],
  );
  const cookie = await signIn(app.baseURL, 'user@example.invalid');
  try {
    expect(await own('byId', { userId: id }, cookie)).toMatchObject({
      ok: true,
      value: {
        id,
        status: 'active',
        emailVerified: false,
        phoneNumber: null,
        role: 'User',
      },
    });
    const page = await fetch(`${app.baseURL}/calendar`, {
      headers: { cookie },
      redirect: 'manual',
    });
    expect(page.headers.get('location')).toBe('/onboarding');
    expect(
      await (
        await fetch(`${app.baseURL}/onboarding`, { headers: { cookie } })
      ).text(),
    ).toContain('Welcome to CCRU');
    expect(
      await operation(
        app.baseURL,
        'calendar',
        'positionServerFns',
        'all',
        undefined,
        cookie,
      ),
    ).toMatchObject({ ok: false });
    expect(
      await own('completeOnboarding', { userId: id }, cookie),
    ).toMatchObject({ ok: false });
    expect(
      await own(
        'updateOnboardingProfile',
        { userId: id, phoneNumber: '5551234' },
        cookie,
      ),
    ).toMatchObject({ ok: false });
    expect(
      await own(
        'updateOnboardingProfile',
        {
          userId: id,
          display: 'Forged',
          timestampOnboardingCompleted: '2026-01-01',
        },
        cookie,
      ),
    ).toMatchObject({ ok: false });
    expect(
      await own(
        'updateOnboardingProfile',
        { userId: id, phoneNumber: '+1 555 010 0100' },
        cookie,
      ),
    ).toMatchObject({ ok: true });
    const count = app.emails.length;
    expect(
      (
        await post(
          'send-verification-email',
          { email: 'user@example.invalid', callbackURL: '/onboarding' },
          cookie,
        )
      ).status,
    ).toBe(200);
    expect(app.emails.length).toBe(count + 1);
    const link = new URL(app.emails.at(-1)!.html.match(/href="([^"]+)"/)![1]);
    await fetch(`${app.baseURL}${link.pathname}${link.search}`, {
      redirect: 'manual',
    });
    expect(
      await own('completeOnboarding', { userId: id }, cookie),
    ).toMatchObject({ ok: true });
    expect(await own('byId', { userId: id }, cookie)).toMatchObject({
      ok: true,
      value: {
        id,
        status: 'active',
        role: 'User',
        emailVerified: true,
        phoneNumber: '+15550100100',
        timestampOnboardingCompleted: '2026-01-03 00:00:00',
      },
    });
  } finally {
    await fixture.client.query(
      `UPDATE "better-auth"."user" SET email_verified=true,phone_number='+15550100100' WHERE id=$1`,
      [id],
    );
  }
}, 30000);

test('inactive identities cannot sign in with either provider', async () => {
  await fixture.client.query(
    `UPDATE "better-auth"."user" SET status='inactive' WHERE email='officer@example.invalid'`,
  );
  try {
    expect(
      (
        await post('sign-in/email', {
          email: 'officer@example.invalid',
          password: 'fixture-password-36',
        })
      ).status,
    ).toBe(403);
    const callback = await google('officer@example.invalid');
    expect(callback.status).toBe(403);
    expect(await callback.text()).toContain('inactive');
  } finally {
    await fixture.client.query(
      `UPDATE "better-auth"."user" SET status='active' WHERE email='officer@example.invalid'`,
    );
  }
}, 30000);

test('Developers can change policy, while invalid modes and client-supplied authority are rejected', async () => {
  const developer = await signIn(app.baseURL, 'developer@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'updateMode',
      { mode: 'open' },
      developer,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'updateMode',
      { mode: 'unsupported' },
      developer,
    ),
  ).toMatchObject({ ok: false });
  const ordinary = await signIn(app.baseURL, 'user@example.invalid');
  expect(
    await operation(
      app.baseURL,
      'registration',
      'registrationServerFns',
      'updateMode',
      { mode: 'open', actorId: 'developer', role: 'Developer' },
      ordinary,
    ),
  ).toMatchObject({ ok: false });
}, 30000);

test('a valid retained verified account signs in in closed mode without reverification', async () => {
  const before = app.emails.length;
  const cookie = await signIn(app.baseURL, 'developer@example.invalid');
  expect(
    await own(
      'byId',
      { userId: '01930000-0000-7000-8000-000000000004' },
      cookie,
    ),
  ).toMatchObject({
    ok: true,
    value: { emailVerified: true, status: 'active', role: 'Developer' },
  });
  expect(app.emails.length).toBe(before);
  expect(
    await operation(
      app.baseURL,
      'calendar',
      'positionServerFns',
      'all',
      undefined,
      cookie,
    ),
  ).toMatchObject({ ok: true });
}, 30000);

test('Google accounts without name components can supply them during onboarding', async () => {
  await openRegistration();
  const response = await google('missing-names@example.invalid', true, false);
  expect(response.headers.get('location')).not.toContain('error=');
  const cookie = cookies(response);
  const session = await (
    await fetch(`${app.baseURL}/api/auth/get-session`, { headers: { cookie } })
  ).json();
  expect(session.user.emailVerified).toBe(true);
  expect(
    await own('completeOnboarding', { userId: session.user.id }, cookie),
  ).toMatchObject({ ok: false });
  expect(
    await own(
      'updateOnboardingProfile',
      {
        userId: session.user.id,
        nameFirst: 'Provided',
        nameLast: 'Names',
        phoneNumber: '+15550100222',
      },
      cookie,
    ),
  ).toMatchObject({ ok: true });
  expect(
    await own('completeOnboarding', { userId: session.user.id }, cookie),
  ).toMatchObject({ ok: true });
  expect(await own('byId', { userId: session.user.id }, cookie)).toMatchObject({
    ok: true,
    value: { display: 'Provided Names', status: 'active' },
  });
}, 30000);
