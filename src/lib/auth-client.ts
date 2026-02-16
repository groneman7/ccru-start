import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const apiBaseUrl =
  import.meta.env.BETTER_AUTH_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  plugins: [adminClient()],
});
