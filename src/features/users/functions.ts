import { subject } from '@casl/ability';
import { createServerFn } from '@tanstack/react-start';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import {
  createCertificationSchema,
  updateCertificationSchema,
  userToggleableStatusSchema,
} from '~/features/users/schema';
import {
  certificationService as certification,
  userService as user,
} from '~/features/users/services';
import { db } from '~/server/db';
import { userInBetterAuth as users } from '~/server/db/schema';
import {
  denyPermission,
  requirePermission,
} from '~/server/permissions/require-permission';
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
  await requirePermission('read', 'Certification');
  return await certification.all();
});

export const getCertificationByIdServerFn = createServerFn()
  .validator(object({ certificationId: uuidv7() }))
  .handler(async ({ data }) => {
    await requirePermission('read', 'Certification');
    return await certification.byId(data);
  });

export const createCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(createCertificationSchema)
  .handler(async ({ data }) => {
    await requirePermission('create', 'Certification');
    return await certification.create(data);
  });

export const updateCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(updateCertificationSchema)
  .handler(async ({ data }) => {
    await requirePermission('update', 'Certification');
    return await certification.update(data);
  });

// Users ----------------------------------------------------------------------

export const allUsersServerFn = createServerFn().handler(async () => {
  await requirePermission('list', 'User');
  return await user.all();
});

export const allUsersForComboboxServerFn = createServerFn().handler(
  async () => {
    await requirePermission('create', 'Slot');
    return await user.allForCombobox();
  },
);

export const getUserByIdServerFn = createServerFn()
  .validator(object({ userId: uuidv7() }))
  .handler(async ({ data }) => {
    await requirePermission('read', subject('User', { id: data.userId }));
    return await user.byId(data);
  });

export const completeOnboardingServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: string() }))
  .handler(async ({ data }) => {
    await requirePermission('update', subject('User', { id: data.userId }));
    const profile = await user.byId(data);
    if (
      !profile.emailVerified ||
      !profile.nameFirst?.trim() ||
      !profile.nameLast?.trim() ||
      !profile.phoneNumber?.trim()
    )
      denyPermission('Complete verified profile requirements first', 400);
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
    await requirePermission('update', subject('User', { id: data.userId }));
    if (
      data.email &&
      data.email !== (await user.byId({ userId: data.userId })).email
    )
      denyPermission('Use the verified email-change workflow', 400);
    return await user.updateOnboardingProfile(data);
  });

export const updateSystemRoleServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: uuidv7(), role: zodEnum(SYSTEM_ROLES) }))
  .handler(async ({ data }) => {
    const { permissions } = await requirePermission(
      'assign',
      subject('SystemRole', { nextRole: data.role }),
    );
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
          permissions.can(
            'assign',
            subject('SystemRole', {
              currentRole: 'Developer',
              nextRole: data.role,
            }),
          )
            ? undefined
            : ne(users.role, 'Developer'),
        ),
      )
      .returning({ id: users.id });
    if (!row) denyPermission();
    return row;
  });

export const updateUserStatusServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: string(), status: userToggleableStatusSchema }))
  .handler(async ({ data }) => {
    await requirePermission('update-status', 'User');
    return await user.updateStatus(data);
  });

export const updateUserTypeServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userId: string(), userTypeId: string() }))
  .handler(async ({ data }) => {
    await requirePermission('update-type', 'User');
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
    await requirePermission('update', 'OfficerCapabilities');
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
      denyPermission('Capabilities may only be assigned to Officers', 400);
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
