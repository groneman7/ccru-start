import { mutationOptions } from '@tanstack/react-query';
import { userServerFns as user } from '~/features/admin/users.functions';

export function completeOnboardingMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string }) =>
      user.completeOnboarding({ data: input }),
  });
}

export function updateOnboardingProfileMutation() {
  return mutationOptions({
    mutationFn: (input: {
      userId: string;
      displayName?: string;
      email?: string;
      nameFirst?: string;
      nameMiddle?: string | null;
      nameLast?: string;
      phoneNumber?: string | null;
      postNominals?: string | null;
    }) => user.updateOnboardingProfile({ data: input }),
  });
}

export function updateSystemRoleMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string; systemRoleId: string }) =>
      user.updateSystemRole({ data: input }),
  });
}

export function updateUserTypeMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string; userTypeId: string }) =>
      user.updateUserType({ data: input }),
  });
}
