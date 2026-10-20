import { dash } from '@better-auth/infra';
import { sentinelClient } from '@better-auth/infra/client';
import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const apiBaseUrl =
  import.meta.env.BETTER_AUTH_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: {
        nameFirst: { type: 'string', input: true },
        nameLast: { type: 'string', input: true },
      },
    }),
    sentinelClient(),
    dash({
      apiUrl: 'https://ccruoutreach.com/api/auth',
    }),
  ],
});
