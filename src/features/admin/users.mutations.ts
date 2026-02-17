import { mutationOptions } from '@tanstack/react-query';
import { userServerFns as user } from '~/features/admin/users.functions';

export function completeOnboardingMutation() {
  return mutationOptions({
    mutationFn: (input: { userId: string }) =>
      user.completeOnboarding({ data: input }),
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
