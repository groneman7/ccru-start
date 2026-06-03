import { db } from '~/server/db';
import {
  certificationsInAuthz as certifications,
  userInBetterAuth as users,
  userTypesInAuthz,
} from '~/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { infer as Infer } from 'zod';
import type {
  createCertificationSchema,
  updateCertificationSchema,
  userSchemaForCombobox,
} from './schema';

type UpdateOnboardingProfileInput = {
  userId: string;
  display?: string;
  email?: string;
  nameFirst?: string;
  nameMiddle?: string | null;
  nameLast?: string;
  phoneNumber?: string | null;
  postNominals?: string | null;
};

export const userRepository = {
  all: async () => {
    const rows = await db.select().from(users);

    return rows;
  },
  allForCombobox: async (): Promise<Infer<typeof userSchemaForCombobox>[]> => {
    const rows = await db
      .select({
        id: users.id,
        display: users.display,
        nameFirst: users.nameFirst,
        nameLast: users.nameLast,
        role: users.role,
        userTypeId: users.userTypeId,
      })
      .from(users);

    return rows;
  },
  byId: async (input: { userId: string }) => {
    const { userId } = input;
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));

    let userTypeDisplay: string | null = null;
    if (userRow.userTypeId) {
      const [userTypeRow] = await db
        .select({ userTypeDisplay: userTypesInAuthz.display })
        .from(userTypesInAuthz)
        .where(eq(userTypesInAuthz.id, userRow.userTypeId));

      userTypeDisplay = userTypeRow.userTypeDisplay;
    }

    return { ...userRow, userTypeDisplay };
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
  updateOnboardingProfile: async (input: UpdateOnboardingProfileInput) => {
    const { userId, ...changes } = input;
    const [row] = await db
      .update(users)
      .set({
        ...changes,
        timestampUpdatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return row;
  },
  updateSystemRole: async (input: { userId: string; role: string }) => {
    const { userId, role } = input;
    const [row] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return row;
  },
  updateStatus: async (input: { userId: string; status: 'active' | 'inactive' }) => {
    const { userId, status } = input;
    const [row] = await db
      .update(users)
      .set({ status, timestampUpdatedAt: sql`CURRENT_TIMESTAMP` })
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

export const certificationRepository = {
  all: async () => {
    const rows = await db.select().from(certifications);

    return rows;
  },
  byId: async (input: { certificationId: string }) => {
    const { certificationId } = input;
    const [row] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.id, certificationId));

    return row;
  },
  create: async (input: Infer<typeof createCertificationSchema>) => {
    const [row] = await db
      .insert(certifications)
      .values(input)
      .returning({ id: certifications.id });

    return row;
  },
  update: async (input: Infer<typeof updateCertificationSchema>) => {
    const { certificationId, data } = input;
    const [row] = await db
      .update(certifications)
      .set(data)
      .where(eq(certifications.id, certificationId))
      .returning({ id: certifications.id });

    return row;
  },
};
