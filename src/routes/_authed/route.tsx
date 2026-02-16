import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppSidebar, Workspace } from '~/components';
import { SidebarProvider } from '~/components/ui';
import { auth } from '~/server/auth';

const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server');

  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
});

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      });
    }

    return {
      currentUser: {
        ...session.user,
        isImpersonated: !!session.session.impersonatedBy,
      },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="bg-blue-50">
      <SidebarProvider>
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
