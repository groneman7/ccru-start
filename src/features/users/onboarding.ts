import { profileFieldsSchema } from '~/features/users/schema';

export const onboardingFieldsSchema = profileFieldsSchema.extend({
  phoneNumber: profileFieldsSchema.shape.phoneNumber.refine(
    (value) => value !== null,
    'A phone number with country code is required',
  ),
});
export type OnboardingIdentity = {
  emailVerified?: boolean;
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
