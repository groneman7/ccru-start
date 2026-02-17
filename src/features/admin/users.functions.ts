import { createServerFn } from '@tanstack/react-start';
import { userService as user } from '~/features/admin/users.services';
import { object, string } from 'zod';

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
  updateSystemRole: updateSystemRoleServerFn,
  updateUserType: updateUserTypeServerFn,
};
