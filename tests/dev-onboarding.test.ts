import { afterEach, expect, test, vi } from 'vitest';
import { canAccessWorkspace } from '../src/features/users/onboarding';
import { withOnboardingBypass } from '../src/server/dev-onboarding';
import { getUserPermissions } from '../src/server/permissions';

const user = {
  id: 'test-user',
  email: 'tester@example.invalid',
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
  vi.stubEnv('DEV_ONBOARDING_BYPASS_EMAILS', user.email);
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

test('only explicitly selected emails bypass onboarding; defaults remain strict', () => {
  configure('development');
  expect(
    withOnboardingBypass({ ...user, email: 'real@example.org' })
      .onboardingBypassed,
  ).toBe(false);
  vi.stubEnv('DEV_ONBOARDING_BYPASS_EMAILS', '');
  expect(withOnboardingBypass(user).onboardingBypassed).toBe(false);
  vi.stubEnv(
    'DEV_ONBOARDING_BYPASS_EMAILS',
    ` other@example.invalid, ${user.email.toUpperCase()} `,
  );
  expect(withOnboardingBypass(user).onboardingBypassed).toBe(true);
});

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
