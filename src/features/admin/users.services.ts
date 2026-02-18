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
  updateOnboardingProfile: async (input: {
    userId: string;
    displayName?: string;
    email?: string;
    nameFirst?: string;
    nameMiddle?: string | null;
    nameLast?: string;
    phoneNumber?: string | null;
    postNominals?: string | null;
  }) => {
    return await user.updateOnboardingProfile(input);
  },
  updateSystemRole: async (input: { userId: string; systemRoleId: string }) => {
    return await user.updateSystemRole(input);
  },
  updateUserType: async (input: { userId: string; userTypeId: string }) => {
    return await user.updateUserType(input);
  },
};
