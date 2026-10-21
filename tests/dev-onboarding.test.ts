import { afterEach, expect, test, vi } from 'vitest';
import { canAccessWorkspace } from '../src/features/users/onboarding';
import { withOnboardingBypass } from '../src/server/dev-onboarding';
import { getUserPermissions } from '../src/server/permissions';

const user = {
  id: 'test-user',
  email: 'tester@example.invalid',
  isDevAccount: true,
  role: 'User',
  status: 'invited',
  emailVerified: false,
  phoneNumber: null,
  timestampOnboardingCompleted: null,
};
afterEach(() => vi.unstubAllEnvs());
function configure(node: string, vercel?: string) {
  vi.stubEnv('NODE_ENV', node);
  vi.stubEnv('VERCEL_ENV', vercel);
  vi.stubEnv('DEV_ONBOARDING_BYPASS_ENABLED', undefined);
}

test.each([
  ['development', undefined, true],
  ['production', 'preview', true],
  ['production', 'development', true],
  ['production', 'production', false],
  ['development', 'production', false],
  ['production', undefined, false],
  ['development', 'unexpected', false],
])('environment %s / %s permits bypass: %s', (node, vercel, allowed) => {
  configure(node, vercel);
  const identity = withOnboardingBypass(user);
  expect(identity.onboardingBypassed).toBe(allowed);
  expect(canAccessWorkspace(identity)).toBe(allowed);
  expect(getUserPermissions(identity).can('read', 'CalendarEvent')).toBe(
    allowed,
  );
  expect(identity.emailVerified).toBe(false);
  expect(identity.timestampOnboardingCompleted).toBeNull();
  expect(identity.status).toBe('invited');
  expect(getUserPermissions(identity).can('update', 'RegistrationMode')).toBe(
    false,
  );
});

test('only flagged accounts bypass onboarding; the email allowlist is ignored', () => {
  configure('development');
  vi.stubEnv('DEV_ONBOARDING_BYPASS_EMAILS', user.email);
  expect(
    withOnboardingBypass({ ...user, isDevAccount: false }).onboardingBypassed,
  ).toBe(false);
  expect(
    withOnboardingBypass({ isDevAccount: undefined }).onboardingBypassed,
  ).toBe(false);
});

test.each([
  [undefined, true],
  ['true', true],
  ['false', false],
  ['', false],
  ['unexpected', false],
])('the environment switch %s enables bypass: %s', (value, allowed) => {
  configure('development');
  vi.stubEnv('DEV_ONBOARDING_BYPASS_ENABLED', value);
  expect(withOnboardingBypass(user).onboardingBypassed).toBe(allowed);
});

test.each(['User', 'Officer', 'Administrator', 'Developer'])(
  'only Developers can change development-account flags: %s',
  (role) => {
    configure('development');
    const permissions = getUserPermissions(
      withOnboardingBypass({ ...user, role }),
    );
    expect(permissions.can('update-dev-account', 'User')).toBe(
      role === 'Developer',
    );
  },
);

test.each(['inactive', 'unknown'])(
  'bypass does not admit %s accounts',
  (status) => {
    configure('development');
    const identity = withOnboardingBypass({ ...user, status });
    expect(canAccessWorkspace(identity)).toBe(false);
    expect(getUserPermissions(identity).can('read', 'CalendarEvent')).toBe(
      false,
    );
  },
);

test('deleted accounts and fabricated bypass flags cannot acquire access', () => {
  configure('development');
  const deleted = withOnboardingBypass({ ...user, deletedAt: new Date() });
  expect(canAccessWorkspace(deleted)).toBe(false);
  expect(getUserPermissions(deleted).can('read', 'CalendarEvent')).toBe(false);
  configure('production', 'production');
  expect(
    withOnboardingBypass({ ...user, onboardingBypassed: true })
      .onboardingBypassed,
  ).toBe(false);
});
