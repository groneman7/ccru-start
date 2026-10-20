import {
  certificationRepository as certification,
  userRepository as user,
} from '~/features/users/repository';
import type { updateProfileSchema } from '~/features/users/schema';
import type { infer as Infer } from 'zod';

export const userService = {
  updateProfile: async (input: Infer<typeof updateProfileSchema>) =>
    user.updateProfile(input),
  all: async () => {
    return await user.all();
  },
  allForCombobox: async () => {
    return await user.allForCombobox();
  },
  byId: async (input: { userId: string }) => {
    return await user.byId(input);
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
  updateStatus: async (input: {
    userId: string;
    status: 'active' | 'inactive';
  }) => {
    return await user.updateStatus(input);
  },
  updateUserType: async (input: {
    userId: string;
    userTypeId: string | null;
  }) => {
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
