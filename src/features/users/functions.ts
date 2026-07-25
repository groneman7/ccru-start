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
import { nullable, object, optional, string, uuidv7 } from 'zod';

// Certifications -------------------------------------------------------------

export const allCertificationsServerFn = createServerFn().handler(async () => {
  return await certification.all();
});

export const getCertificationByIdServerFn = createServerFn()
  .validator(object({ certificationId: uuidv7() }))
  .handler(async ({ data }) => {
    return await certification.byId(data);
  });

export const createCertificationServerFn = createServerFn()
  .validator(createCertificationSchema)
  .handler(async ({ data }) => {
    return await certification.create(data);
  });

export const updateCertificationServerFn = createServerFn()
  .validator(updateCertificationSchema)
  .handler(async ({ data }) => {
    return await certification.update(data);
  });

// Users ----------------------------------------------------------------------

export const allUsersServerFn = createServerFn().handler(async () => {
  return await user.all();
});

export const allUsersForComboboxServerFn = createServerFn().handler(
  async () => {
    return await user.allForCombobox();
  },
);

export const getUserByIdServerFn = createServerFn()
  .validator(object({ userId: uuidv7() }))
  .handler(async ({ data }) => {
    return await user.byId(data);
  });

export const completeOnboardingServerFn = createServerFn()
  .validator(object({ userId: string() }))
  .handler(async ({ data }) => {
    return await user.completeOnboarding(data);
  });

export const updateOnboardingProfileServerFn = createServerFn()
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
    return await user.updateOnboardingProfile(data);
  });

export const updateSystemRoleServerFn = createServerFn()
  .validator(object({ userId: string(), role: string() }))
  .handler(async ({ data }) => {
    return await user.updateSystemRole(data);
  });

export const updateUserStatusServerFn = createServerFn()
  .validator(object({ userId: string(), status: userToggleableStatusSchema }))
  .handler(async ({ data }) => {
    return await user.updateStatus(data);
  });

export const updateUserTypeServerFn = createServerFn()
  .validator(object({ userId: string(), userTypeId: string() }))
  .handler(async ({ data }) => {
    return await user.updateUserType(data);
  });

export const certificationServerFns = {
  all: allCertificationsServerFn,
  byId: getCertificationByIdServerFn,
  create: createCertificationServerFn,
  update: updateCertificationServerFn,
};

export const userServerFns = {
  all: allUsersServerFn,
  allForCombobox: allUsersForComboboxServerFn,
  byId: getUserByIdServerFn,
  completeOnboarding: completeOnboardingServerFn,
  updateOnboardingProfile: updateOnboardingProfileServerFn,
  updateSystemRole: updateSystemRoleServerFn,
  updateStatus: updateUserStatusServerFn,
  updateUserType: updateUserTypeServerFn,
};
