import { createFileRoute, redirect } from '@tanstack/react-router';
import { authSessionQuery } from '~/features/auth/queries';
import { OnboardingScreen } from '~/features/registration/onboarding-screen';
import { canAccessWorkspace } from '~/features/users/onboarding';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.fetchQuery(authSessionQuery());
    if (!session) throw redirect({ to: '/sign-in' });
    if (canAccessWorkspace(session.user)) throw redirect({ to: '/' });
    return { onboardingUser: session.user };
  },
  component: OnboardingPage,
});
function OnboardingPage() {
  const { onboardingUser } = Route.useRouteContext();
  return <OnboardingScreen currentUser={onboardingUser} />;
}
