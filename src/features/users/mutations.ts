import { mutationOptions } from '@tanstack/react-query';
import type { SystemRole } from '~/features/authz/schema';
import {
  certificationServerFns as certification,
  userServerFns as user,
} from '~/features/users/functions';
import type {
  createCertificationSchema,
  updateCertificationSchema,
} from '~/features/users/schema';
import type { infer as Infer } from 'zod';

export function createCertificationMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createCertificationSchema>) =>
      certification.create({ data: input }),
  });
}

export function updateCertificationMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof updateCertificationSchema>) =>
      certification.update({ data: input }),
  });
}

export function completeOnboardingMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string }) =>
      user.completeOnboarding({ data: input }),
  });
}

export function updateOnboardingProfileMutation() {
  return mutationOptions({
    mutationFn: (
      input: Parameters<typeof user.updateOnboardingProfile>[0]['data'],
    ) => user.updateOnboardingProfile({ data: input }),
  });
}

export function updateSystemRoleMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string; role: SystemRole }) =>
      user.updateSystemRole({ data: input }),
  });
}

export function updateUserStatusMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string; status: 'active' | 'inactive' }) =>
      user.updateStatus({ data: input }),
  });
}

export function updateUserTypeMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string; userTypeId: string | null }) =>
      user.updateUserType({ data: input }),
  });
}

export function updateCapabilitiesMutation() {
  return mutationOptions({
    mutationFn: (input: {
      userId: string;
      canManageScheduling?: boolean;
      canManageUsers?: boolean;
    }) => user.updateCapabilities({ data: input }),
  });
}
