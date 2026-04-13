import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppSidebar, Workspace } from '~/components';
import { OnboardingDialog } from '~/components/onboarding-dialog';
import { SidebarProvider } from '~/components/ui';
import { authSessionQuery } from '~/features/auth/queries';
import type { CurrentUser } from '~/server/auth';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.fetchQuery(authSessionQuery());

    if (!session) {
      throw redirect({
        to: '/sign-in',
      });
    }

    const { name, ...user } = session.user;
    const currentUser: CurrentUser = {
      ...user,
      display: name,
    };
    if (session.session.impersonatedBy) {
      currentUser.impersonatedBy = session.session.impersonatedBy;
    }

    return {
      currentUser,
    };
  },
  component: AuthedRouteLayout,
});

function AuthedRouteLayout() {
  const { currentUser } = Route.useRouteContext();

  return (
    <div className="bg-blue-50">
      <SidebarProvider>
        {currentUser.timestampOnboardingCompleted === null &&
          !currentUser.impersonatedBy && <OnboardingDialog />}
        <AppSidebar />
        <div className="b my-2 mr-2 flex flex-1 flex-col rounded-lg border-2 border-blue-100 bg-white">
          <Workspace>
            <Outlet />
          </Workspace>
        </div>
      </SidebarProvider>
    </div>
  );
}
