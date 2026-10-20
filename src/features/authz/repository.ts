import { SYSTEM_ROLES } from '~/features/authz/schema';
import { db } from '~/server/db';
import { userTypesInAuthz as userTypes } from '~/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { throwUserTypeError } from './user-type-errors';

export const authorizationRepository = {
  getAllSystemRoles: () => {
    return SYSTEM_ROLES;
  },
  getAllUserTypes: async () => {
    const rows = await db
      .select({
        id: userTypes.id,
        name: userTypes.name,
        display: userTypes.display,
      })
      .from(userTypes)
      .where(isNull(userTypes.deletedAt));

    return rows;
  },
};

export const userTypeRepository = {
  remove: async ({ userTypeId }: { userTypeId: string }) => {
    const [row] = await db
      .update(userTypes)
      .set({ deletedAt: sql`clock_timestamp()` })
      .where(and(eq(userTypes.id, userTypeId), isNull(userTypes.deletedAt)))
      .returning({ id: userTypes.id })
      .catch(throwUserTypeError);
    if (!row) throw new Error('User type not found');
    return row;
  },
  create: async ({ display }: { display: string }) => {
    const [row] = await db
      .insert(userTypes)
      .values({
        display,
        name: display.normalize('NFKC').toLocaleLowerCase('en-US'),
      })
      .returning({
        id: userTypes.id,
        name: userTypes.name,
        display: userTypes.display,
      })
      .catch(throwUserTypeError);
    return row;
  },
  rename: async ({
    userTypeId,
    display,
  }: {
    userTypeId: string;
    display: string;
  }) => {
    const [row] = await db
      .update(userTypes)
      .set({
        display,
        name: display.normalize('NFKC').toLocaleLowerCase('en-US'),
      })
      .where(and(eq(userTypes.id, userTypeId), isNull(userTypes.deletedAt)))
      .returning({
        id: userTypes.id,
        name: userTypes.name,
        display: userTypes.display,
      })
      .catch(throwUserTypeError);
    if (!row) throw new Error('User type not found');
    return row;
  },
};
