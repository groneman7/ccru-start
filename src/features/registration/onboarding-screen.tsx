import { useNavigate } from '@tanstack/react-router';
import { OnboardingForm } from '~/features/registration/onboarding-form';
import { userServerFns } from '~/features/users/functions';
import { authClient } from '~/lib/auth-client';
import type { AuthUser } from '~/server/auth';

// Onboarding has its own route so protected page loaders never run underneath it.
export function OnboardingScreen({ currentUser }: { currentUser: AuthUser }) {
  const navigate = useNavigate();
  return (
    <OnboardingForm
      key={currentUser.id}
      profile={currentUser}
      onSave={async (data) => {
        await userServerFns.updateOnboardingProfile({
          data: { userId: currentUser.id, ...data },
        });
        const session = await authClient.getSession({
          query: { disableCookieCache: true },
        });
        if (session.error) throw new Error(session.error.message);
        if (!session.data?.user.emailVerified)
          return 'Profile saved. Verify your email, then save again to finish.';
        await userServerFns.completeOnboarding({
          data: { userId: currentUser.id },
        });
        await navigate({ href: '/', reloadDocument: true });
        return '';
      }}
      onResend={async () => {
        const result = await authClient.sendVerificationEmail({
          email: currentUser.email,
          callbackURL: '/onboarding',
        });
        if (result.error) throw new Error(result.error.message);
      }}
      onSignOut={async () => {
        const result = await authClient.signOut();
        if (result.error) throw new Error(result.error.message);
        await navigate({ href: '/sign-in', reloadDocument: true });
      }}
    />
  );
}
