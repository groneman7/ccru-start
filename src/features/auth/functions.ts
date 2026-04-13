import { createServerFn } from '@tanstack/react-start';
import { auth } from '~/server/auth';

export const getSessionServerFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server');

    return auth.api.getSession({
      headers: getRequestHeaders(),
    });
  },
);
