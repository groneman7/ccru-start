import { profileFieldsSchema } from '~/features/users/schema';

export const onboardingFieldsSchema = profileFieldsSchema.extend({
  phoneNumber: profileFieldsSchema.shape.phoneNumber.refine(
    (value) => value !== null,
    'A phone number with country code is required',
  ),
});
export type OnboardingIdentity = {
  emailVerified?: boolean;
  onboardingBypassed?: boolean;
  timestampOnboardingCompleted?: string | Date | null;
  nameFirst?: string | null;
  nameLast?: string | null;
  phoneNumber?: string | null;
};
export function hasCompletedOnboarding(user: OnboardingIdentity) {
  return (
    user.emailVerified === true &&
    !!user.timestampOnboardingCompleted &&
    !!user.nameFirst?.trim() &&
    !!user.nameLast?.trim() &&
    /^\+[1-9]\d{6,14}$/.test(user.phoneNumber ?? '')
  );
}

// The bypass flag is supplied by the server, never by profile input.
export function canAccessWorkspace(
  user: OnboardingIdentity & {
    status?: string | null;
    deletedAt?: string | Date | null;
  },
) {
  if (user.deletedAt) return false;
  return (
    (user.status === 'active' && hasCompletedOnboarding(user)) ||
    ((user.status === 'active' || user.status === 'invited') &&
      user.onboardingBypassed === true)
  );
}
