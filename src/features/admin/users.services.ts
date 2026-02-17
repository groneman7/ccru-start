import { userRepository as user } from '~/features/admin/users.repository';

export const userService = {
  all: async () => {
    return await user.all();
  },
  allForCombobox: async () => {
    return await user.allForCombobox();
  },
  completeOnboarding: async (input: { userId: string }) => {
    return await user.completeOnboarding(input);
  },
  updateSystemRole: async (input: { userId: string; systemRoleId: string }) => {
    return await user.updateSystemRole(input);
  },
  updateUserType: async (input: { userId: string; userTypeId: string }) => {
    return await user.updateUserType(input);
  },
};
