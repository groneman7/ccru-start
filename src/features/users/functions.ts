import { createServerFn } from '@tanstack/react-start';
import {
  createCertificationSchema,
  updateCertificationSchema,
} from '~/features/users/schema';
import {
  certificationService as certification,
  userService as user,
} from '~/features/users/services';
import { nullable, object, optional, string, uuidv7 } from 'zod';

export const allCertificationsServerFn = createServerFn().handler(async () => {
  return await certification.all();
});

export const getCertificationByIdServerFn = createServerFn()
  .inputValidator(object({ certificationId: uuidv7() }))
  .handler(async ({ data }) => {
    return await certification.byId(data);
  });

export const createCertificationServerFn = createServerFn()
  .inputValidator(createCertificationSchema)
  .handler(async ({ data }) => {
    return await certification.create(data);
  });

export const updateCertificationServerFn = createServerFn()
  .inputValidator(updateCertificationSchema)
  .handler(async ({ data }) => {
    return await certification.update(data);
  });

export const allUsersServerFn = createServerFn().handler(async () => {
  return await user.all();
});

export const allUsersForComboboxServerFn = createServerFn().handler(
  async () => {
    return await user.allForCombobox();
  },
);

export const completeOnboardingServerFn = createServerFn()
  .inputValidator(object({ userId: string() }))
  .handler(async ({ data }) => {
    return await user.completeOnboarding(data);
  });

export const updateOnboardingProfileServerFn = createServerFn()
  .inputValidator(
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
  .inputValidator(object({ userId: string(), role: string() }))
  .handler(async ({ data }) => {
    return await user.updateSystemRole(data);
  });

export const updateUserTypeServerFn = createServerFn()
  .inputValidator(object({ userId: string(), userTypeId: string() }))
  .handler(async ({ data }) => {
    return await user.updateUserType(data);
  });

export const userServerFns = {
  all: allUsersServerFn,
  allForCombobox: allUsersForComboboxServerFn,
  completeOnboarding: completeOnboardingServerFn,
  updateOnboardingProfile: updateOnboardingProfileServerFn,
  updateSystemRole: updateSystemRoleServerFn,
  updateUserType: updateUserTypeServerFn,
};

export const certificationServerFns = {
  all: allCertificationsServerFn,
  byId: getCertificationByIdServerFn,
  create: createCertificationServerFn,
  update: updateCertificationServerFn,
};
