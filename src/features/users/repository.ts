import { throwUserTypeError } from '~/features/authz/user-type-errors';
import { throwCertificationError } from '~/features/users/certification-errors';
import { profileDisplayName } from '~/features/users/profile-name';
import { db } from '~/server/db';
import {
  certificationsInAuthz as certifications,
  userInBetterAuth as users,
  userTypesInAuthz,
} from '~/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { infer as Infer } from 'zod';
import type {
  createCertificationSchema,
  updateCertificationSchema,
  updateProfileSchema,
  userSchemaForCombobox,
} from './schema';

export const userRepository = {
  updateProfile: async ({
    userId,
    data,
  }: Infer<typeof updateProfileSchema>) => {
    const [row] = await db
      .update(users)
      .set({
        ...data,
        display: profileDisplayName(data),
        timestampUpdatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });
    if (!row) throw new Error('Profile not found');
    return row;
  },
  all: async () => {
    const rows = await db.select().from(users).where(isNull(users.deletedAt));

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
      .from(users)
      .where(isNull(users.deletedAt));

    return rows;
  },
  byId: async (input: { userId: string }) => {
    const { userId } = input;
    const [userRow] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    if (!userRow) throw new Error('Profile not found');

    let userTypeDisplay: string | null = null;
    if (userRow.userTypeId) {
      const [userTypeRow] = await db
        .select({ userTypeDisplay: userTypesInAuthz.display })
        .from(userTypesInAuthz)
        .where(
          and(
            eq(userTypesInAuthz.id, userRow.userTypeId),
            isNull(userTypesInAuthz.deletedAt),
          ),
        );

      userTypeDisplay = userTypeRow?.userTypeDisplay ?? null;
    }

    return { ...userRow, userTypeDisplay };
  },
  completeOnboarding: async ({
    userId,
    data,
    expectedUpdatedAt,
  }: Infer<typeof updateProfileSchema> & { expectedUpdatedAt: string }) => {
    const [row] = await db
      .update(users)
      .set({
        ...data,
        display: profileDisplayName(data),
        timestampOnboardingCompleted: sql`COALESCE(${users.timestampOnboardingCompleted}, CURRENT_TIMESTAMP)`,
        timestampUpdatedAt: sql`CURRENT_TIMESTAMP`,
        status: sql`CASE WHEN ${users.status} = 'invited' THEN 'active'::account_status ELSE ${users.status} END`,
      })
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deletedAt),
          eq(users.emailVerified, true),
          eq(users.timestampUpdatedAt, expectedUpdatedAt),
          sql`(${users.status} = 'active' OR (${users.status} = 'invited' AND EXISTS (SELECT 1 FROM authz.organization_settings WHERE id=1 AND registration_mode='open')))`,
        ),
      )
      .returning({ id: users.id });
    if (!row)
      throw new Error(
        'Onboarding could not complete. Refresh your profile or contact the organization.',
      );
    return row;
  },
  updateStatus: async (input: {
    userId: string;
    status: 'active' | 'inactive';
  }) => {
    const { userId, status } = input;
    const [row] = await db
      .update(users)
      .set({ status, timestampUpdatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });

    return row;
  },
  updateUserType: async (input: {
    userId: string;
    userTypeId: string | null;
  }) => {
    const { userId, userTypeId } = input;
    const [row] = await db
      .update(users)
      .set({ userTypeId })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id })
      .catch(throwUserTypeError);
    if (!row) throw new Error('Profile not found');

    return row;
  },
};

export const certificationRepository = {
  remove: async ({ certificationId }: { certificationId: string }) => {
    const [row] = await db
      .update(certifications)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(certifications.id, certificationId),
          isNull(certifications.deletedAt),
        ),
      )
      .returning({ id: certifications.id })
      .catch(throwCertificationError);
    if (!row) throw new Error('Certification not found');
    return row;
  },
  all: async () => {
    const rows = await db
      .select()
      .from(certifications)
      .where(isNull(certifications.deletedAt));

    return rows;
  },
  byId: async (input: { certificationId: string }) => {
    const { certificationId } = input;
    const [row] = await db
      .select()
      .from(certifications)
      .where(
        and(
          eq(certifications.id, certificationId),
          isNull(certifications.deletedAt),
        ),
      );
    if (!row) throw new Error('Certification not found');
    return row;
  },
  create: async (input: Infer<typeof createCertificationSchema>) => {
    const [row] = await db
      .insert(certifications)
      .values(input)
      .returning({ id: certifications.id })
      .catch(throwCertificationError);

    return row;
  },
  update: async (input: Infer<typeof updateCertificationSchema>) => {
    const { certificationId, data } = input;
    const [row] = await db
      .update(certifications)
      .set(data)
      .where(
        and(
          eq(certifications.id, certificationId),
          isNull(certifications.deletedAt),
        ),
      )
      .returning({ id: certifications.id })
      .catch(throwCertificationError);
    if (!row) throw new Error('Certification not found');

    return row;
  },
};
