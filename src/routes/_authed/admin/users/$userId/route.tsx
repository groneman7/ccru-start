import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { userByIdQuery } from '~/features/users/queries';

export const Route = createFileRoute('/_authed/admin/users/$userId')({
  loader: async ({ context: { queryClient }, params: { userId } }) => {
    await queryClient.ensureQueryData(userByIdQuery(userId));
  },
  component: UserProfileLayout,
});

function UserProfileLayout() {
  const { data: user } = useQuery(userByIdQuery(Route.useParams().userId));
  if (!user) return null;
  const initials =
    [user.nameFirst, user.nameLast]
      .map((name) => name?.trim().slice(0, 1) ?? '')
      .join('') || '?';
  return (
    <>
      <WorkspaceHeader>Profile</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <aside className="flex w-full flex-col gap-3 lg:w-64">
          {user.image ? (
            <img
              src={user.image}
              alt={`${user.display}'s profile`}
              className="size-32 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-32 items-center justify-center rounded-full bg-muted text-4xl"
            >
              {initials}
            </div>
          )}
          <h1 className="text-2xl font-semibold">{user.display}</h1>
          <p>
            {user.role} · {user.status}
          </p>
          <p>{user.userTypeDisplay ?? 'No user type'}</p>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </WorkspaceContent>
    </>
  );
}
