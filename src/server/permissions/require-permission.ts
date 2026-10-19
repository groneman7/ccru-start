import {
  getRequestHeaders,
  setResponseStatus,
} from '@tanstack/react-start/server';
import { auth } from '~/server/auth';
import { getUserPermissions } from '~/server/permissions';
import type { Permission } from '~/server/permissions';

export function denyPermission(message = 'Forbidden', status = 403): never {
  setResponseStatus(status);
  throw new Error(message);
}

export async function requirePermission(...permission: Permission) {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    query: { disableCookieCache: true },
  });
  if (!session) return denyPermission('Unauthorized', 401);
  const permissions = getUserPermissions(session.user);
  if (!permissions.can(...permission)) return denyPermission();
  return { actor: session.user, permissions };
}
