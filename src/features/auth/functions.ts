import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { db } from '~/server/db';
import { userTypesInAuthz } from '~/server/db/schema';
import { auth } from '~/server/auth';
import type { AuthSessionWithUserType } from '~/server/auth';

export const getSessionServerFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSessionWithUserType | null> => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server');

    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    });

    if (!session) return null;

    const userType = session.user.userTypeId
      ? await db.query.userTypesInAuthz.findFirst({
          where: eq(userTypesInAuthz.id, session.user.userTypeId),
        })
      : null;

    return {
      ...session,
      userType: userType ?? null,
    };
  },
);
