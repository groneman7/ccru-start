import { db } from '~/server/db';
import { userInBetterAuth as users } from '~/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { infer as Infer } from 'zod';
import type { userSchemaForCombobox } from './users.schema';

export const userRepository = {
  all: async () => {
    const rows = await db.select().from(users);

    return rows;
  },
  allForCombobox: async (): Promise<Infer<typeof userSchemaForCombobox>[]> => {
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        nameFirst: users.nameFirst,
        nameLast: users.nameLast,
        systemRoleId: users.systemRoleId,
        userTypeId: users.userTypeId,
      })
      .from(users);

    return rows;
  },
  completeOnboarding: async (input: { userId: string }) => {
    const { userId } = input;
    const [row] = await db
      .update(users)
      .set({ timestampOnboardingCompleted: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return row;
  },
  updateSystemRole: async (input: { userId: string; systemRoleId: string }) => {
    const { userId, systemRoleId } = input;
    const [row] = await db
      .update(users)
      .set({ systemRoleId })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return row;
  },
  updateUserType: async (input: { userId: string; userTypeId: string }) => {
    const { userId, userTypeId } = input;
    const [row] = await db
      .update(users)
      .set({ userTypeId })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return row;
  },
};
