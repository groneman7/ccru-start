import { createFileRoute } from '@tanstack/react-router';
import { auth } from '~/server/auth';

// This API endpoint forwards all auth requests to Better Auth's handler.

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
