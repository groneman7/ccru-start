import { createServerFn } from '@tanstack/react-start';
import {
  createCertificationSchema,
  updateCertificationSchema,
  userToggleableStatusSchema,
} from '~/features/users/schema';
import {
  certificationService as certification,
  userService as user,
} from '~/features/users/services';
import { denyAuthority, requireAuthority } from '~/server/authority';
import { db } from '~/server/db';
import { userInBetterAuth as users } from '~/server/db/schema';
import { hasAuthority, SYSTEM_ROLES } from '~/server/permissions/policy';
import { and, eq, ne, sql } from 'drizzle-orm';
import {
  boolean,
  nullable,
  object,
  optional,
  string,
  uuidv7,
  enum as zodEnum,
} from 'zod';

// Certifications -------------------------------------------------------------

export const allCertificationsServerFn = createServerFn().handler(async () => {
  await requireAuthority('authenticated');
  return await certification.all();
});

export const getCertificationByIdServerFn = createServerFn()
  .validator(object({ certificationId: uuidv7() }))
  .handler(async ({ data }) => {
    await requireAuthority('authenticated');
    return await certification.byId(data);
  });

export const createCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(createCertificationSchema)
  .handler(async ({ data }) => {
    await requireAuthority('users');
    return await certification.create(data);
  });

export const updateCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(updateCertificationSchema)
  .handler(async ({ data }) => {
    await requireAuthority('users');
    return await certification.update(data);
  });

// Users ----------------------------------------------------------------------

export const allUsersServerFn = createServerFn().handler(async () => {
  await requireAuthority('profiles');
  return await user.all();
});

export const allUsersForComboboxServerFn = createServerFn().handler(
  async () => {
    await requireAuthority('scheduling');
    return await user.allForCombobox();
  },
);

export const getUserByIdServerFn = createServerFn()
  .validator(object({ userId: uuidv7() }))
  .handler(async ({ data }) => {
    const actor = await requireAuthority('authenticated');
    if (data.userId !== actor.id && !hasAuthority(actor, 'profiles'))
      denyAuthority();
    return await user.byId(data);
  });

export const completeOnboardingServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: string() }))
  .handler(async ({ data }) => {
    const actor = await requireAuthority('authenticated');
    if (data.userId !== actor.id && !hasAuthority(actor, 'users'))
      denyAuthority();
    const profile = await user.byId(data);
    if (
      !profile.emailVerified ||
      !profile.nameFirst?.trim() ||
      !profile.nameLast?.trim() ||
      !profile.phoneNumber?.trim()
    )
      denyAuthority('Complete verified profile requirements first', 400);
    return await user.completeOnboarding(data);
  });

export const updateOnboardingProfileServerFn = createServerFn({
  method: 'POST',
})
  .validator(
    object({
      userId: string(),
      display: optional(string()),
      email: optional(string()),
      nameFirst: optional(string()),
      nameMiddle: optional(nullable(string())),
      nameLast: optional(string()),
      phoneNumber: optional(nullable(string())),
      postNominals: optional(nullable(string())),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireAuthority('authenticated');
    if (data.userId !== actor.id && !hasAuthority(actor, 'users'))
      denyAuthority();
    if (
      data.email &&
      data.email !== (await user.byId({ userId: data.userId })).email
    )
      denyAuthority('Use the verified email-change workflow', 400);
    return await user.updateOnboardingProfile(data);
  });

export const updateSystemRoleServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: uuidv7(), role: zodEnum(SYSTEM_ROLES) }))
  .handler(async ({ data }) => {
    const actor = await requireAuthority('roles');
    if (data.role === 'Developer' && actor.role !== 'Developer')
      denyAuthority();
    const [row] = await db
      .update(users)
      .set({
        role: data.role,
        canManageScheduling: sql`CASE WHEN ${users.role} = ${data.role} THEN ${users.canManageScheduling} ELSE false END`,
        canManageUsers: sql`CASE WHEN ${users.role} = ${data.role} THEN ${users.canManageUsers} ELSE false END`,
      })
      .where(
        and(
          eq(users.id, data.userId),
          actor.role === 'Developer' ? undefined : ne(users.role, 'Developer'),
        ),
      )
      .returning({ id: users.id });
    if (!row) denyAuthority();
    return row;
  });

export const updateUserStatusServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: string(), status: userToggleableStatusSchema }))
  .handler(async ({ data }) => {
    await requireAuthority('users');
    return await user.updateStatus(data);
  });

export const updateUserTypeServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: string(), userTypeId: string() }))
  .handler(async ({ data }) => {
    await requireAuthority('users');
    return await user.updateUserType(data);
  });

export const certificationServerFns = {
  all: allCertificationsServerFn,
  byId: getCertificationByIdServerFn,
  create: createCertificationServerFn,
  update: updateCertificationServerFn,
};

export const updateCapabilitiesServerFn = createServerFn({ method: 'POST' })
  .validator(
    object({
      userId: uuidv7(),
      canManageScheduling: optional(boolean()),
      canManageUsers: optional(boolean()),
    }).refine(
      (v) =>
        v.canManageScheduling !== undefined || v.canManageUsers !== undefined,
    ),
  )
  .handler(async ({ data }) => {
    await requireAuthority('roles');
    const [row] = await db
      .update(users)
      .set({
        canManageScheduling: data.canManageScheduling,
        canManageUsers: data.canManageUsers,
      })
      .where(and(eq(users.id, data.userId), eq(users.role, 'Officer')))
      .returning({
        id: users.id,
        canManageScheduling: users.canManageScheduling,
        canManageUsers: users.canManageUsers,
      });
    if (!row)
      denyAuthority('Capabilities may only be assigned to Officers', 400);
    return row;
  });

export const userServerFns = {
  updateCapabilities: updateCapabilitiesServerFn,
  all: allUsersServerFn,
  allForCombobox: allUsersForComboboxServerFn,
  byId: getUserByIdServerFn,
  completeOnboarding: completeOnboardingServerFn,
  updateOnboardingProfile: updateOnboardingProfileServerFn,
  updateSystemRole: updateSystemRoleServerFn,
  updateStatus: updateUserStatusServerFn,
  updateUserType: updateUserTypeServerFn,
};
