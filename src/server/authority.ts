import {
  getRequestHeaders,
  setResponseStatus,
} from '@tanstack/react-start/server';
import { auth } from '~/server/auth';
import { hasAuthority } from '~/server/permissions/policy';
import type { Authority } from '~/server/permissions/policy';

export function denyAuthority(message = 'Forbidden', status = 403): never {
  setResponseStatus(status);
  throw new Error(message);
}

export async function requireAuthority(authority: Authority) {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    query: { disableCookieCache: true },
  });
  if (!session) return denyAuthority('Unauthorized', 401);
  if (!hasAuthority(session.user, authority)) return denyAuthority();
  return session.user;
}
