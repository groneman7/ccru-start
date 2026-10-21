// Server-derived access only: never persist verification or onboarding claims.
export function shouldBypassOnboarding(user: { email: string }) {
  // Read at runtime; Vite replaces direct process.env.NODE_ENV references.
  const env = process.env;
  const environment = env.VERCEL_ENV;
  const eligibleEnvironment =
    environment === 'preview' ||
    environment === 'development' ||
    (!environment && env.NODE_ENV === 'development');
  if (!eligibleEnvironment) return false;

  const emails = (env.DEV_ONBOARDING_BYPASS_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return emails.includes(user.email.trim().toLowerCase());
}

export function withOnboardingBypass<T extends { email: string }>(user: T) {
  return { ...user, onboardingBypassed: shouldBypassOnboarding(user) };
}
