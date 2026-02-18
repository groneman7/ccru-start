import { createServerFn } from '@tanstack/react-start';
import { userService as user } from '~/features/admin/users.services';
import { nullable, object, optional, string } from 'zod';

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
      displayName: optional(string()),
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
  .inputValidator(object({ userId: string(), systemRoleId: string() }))
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
