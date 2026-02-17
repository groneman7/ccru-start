// import { usePostHog } from '@posthog/react';
import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceHeader } from '~/components';
import { Button } from '~/components/ui';
import dayjs from 'dayjs';

export const Route = createFileRoute('/_authed/')({ component: App });

function App() {
  // const posthog = usePostHog();

  // const handleDocumentationClick = () => {
  //   posthog.capture('documentation_link_clicked', {
  //     url: 'https://tanstack.com/start',
  //     link_text: 'Documentation',
  //   });
  // };
  const { currentUser } = Route.useRouteContext();

  // const completeOnboarding = useMutation(
  //   trpc.users.completeOnboarding.mutationOptions(),
  // );

  const t1 = dayjs(currentUser.timestampFirstLogin);
  const t2 = dayjs();
  const timeSinceFirstLogin = t2.diff(t1, 'hour');

  const getGreeting = (first24: boolean) => {
    const now = dayjs();
    if (now.hour() < 5) return first24 ? 'Welcome' : 'Welcome back';
    if (now.hour() >= 5 && now.hour() < 12) return 'Good morning';
    if (now.hour() >= 12 && now.hour() < 17) return 'Good afternoon';
    if (now.hour() >= 17) return 'Good evening';
  };

  return (
    <>
      <WorkspaceHeader>
        {`${getGreeting(timeSinceFirstLogin < 24)}, ${currentUser.nameFirst}.`}
      </WorkspaceHeader>
      {!currentUser.timestampOnboardingCompleted && (
        <Button
        // onClick={() => completeOnboarding.mutate({ userId: currentUser.id })}
        >
          Mark onboarding complete
        </Button>
      )}
    </>
  );
}
