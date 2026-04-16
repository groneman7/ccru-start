import {
  certificationRepository as certification,
  userRepository as user,
} from '~/features/users/repository';

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
    display?: string;
    email?: string;
    nameFirst?: string;
    nameMiddle?: string | null;
    nameLast?: string;
    phoneNumber?: string | null;
    postNominals?: string | null;
  }) => {
    return await user.updateOnboardingProfile(input);
  },
  updateSystemRole: async (input: { userId: string; role: string }) => {
    return await user.updateSystemRole(input);
  },
  updateUserType: async (input: { userId: string; userTypeId: string }) => {
    return await user.updateUserType(input);
  },
};

export const certificationService = {
  all: async () => {
    return await certification.all();
  },
  byId: async (input: { certificationId: string }) => {
    return await certification.byId(input);
  },
  create: async (input: {
    name: string;
    display: string;
    parent: string | null;
  }) => {
    return await certification.create(input);
  },
  update: async (input: {
    certificationId: string;
    data: {
      name?: string;
      display?: string;
      parent?: string | null;
    };
  }) => {
    return await certification.update(input);
  },
};
