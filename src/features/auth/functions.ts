import { createServerFn } from '@tanstack/react-start';
import { auth } from '~/server/auth';
import type { AuthSessionWithUserType } from '~/server/auth';
import { db } from '~/server/db';
import { userTypesInAuthz } from '~/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export const getSessionServerFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSessionWithUserType | null> => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server');

    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    });

    if (!session || session.user.deletedAt) return null;

    const userType = session.user.userTypeId
      ? await db.query.userTypesInAuthz.findFirst({
          where: and(
            eq(userTypesInAuthz.id, session.user.userTypeId),
            isNull(userTypesInAuthz.deletedAt),
          ),
        })
      : null;

    return {
      ...session,
      userType: userType ?? null,
    };
  },
);
