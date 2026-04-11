import { IconShieldLockFilled } from '@tabler/icons-react';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute('/_authed/admin')({
  loader: ({ context: { currentUser } }) => {
    const permissions = getUserPermissions(currentUser);
    return {
      authorized: permissions.can('manage', 'System'),
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { authorized } = Route.useLoaderData();
  if (!authorized) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex w-lg flex-col items-center justify-center gap-4 rounded-lg bg-blue-500/10 p-8 shadow-lg">
          <div className="flex flex-col gap-2 text-center">
            <div className="flex items-center justify-center gap-4">
              <IconShieldLockFilled className="size-48 text-blue-900/70" />
              <span className="text-6xl font-bold text-shadow-lg">Uh oh! </span>
            </div>
            <span className="text-2xl">
              You do not have permission to access these tools. If you believe
              this is an error, please contact your administrator.
            </span>
          </div>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
