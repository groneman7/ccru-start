// Server-derived access only: never persist verification or onboarding claims.
export function shouldBypassOnboarding(user: { isDevAccount?: boolean }) {
  // Read at runtime; Vite replaces direct process.env.NODE_ENV references.
  const env = process.env;
  const environment = env.VERCEL_ENV;
  const eligibleEnvironment =
    environment === 'preview' ||
    environment === 'development' ||
    (!environment && env.NODE_ENV === 'development');
  const enabled = env.DEV_ONBOARDING_BYPASS_ENABLED;
  return (
    eligibleEnvironment &&
    (enabled === undefined || enabled === 'true') &&
    user.isDevAccount === true
  );
}

export function withOnboardingBypass<T extends { isDevAccount?: boolean }>(
  user: T,
) {
  return { ...user, onboardingBypassed: shouldBypassOnboarding(user) };
}
