import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { userByIdQuery } from '~/features/users/queries';

export const Route = createFileRoute('/_authed/admin/users/$userId')({
  loader: async ({ context: { queryClient }, params: { userId } }) => {
    await Promise.all([queryClient.ensureQueryData(userByIdQuery(userId))]);
  },
  component: UserIdRouteLayout,
});

function UserIdRouteLayout() {
  return (
    <>
      <WorkspaceHeader>User</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <UserSummary />
        <div>outlet</div>
      </WorkspaceContent>
    </>
  );
}

function UserSummary() {
  // Queries
  const { data: user } = useQuery(userByIdQuery(Route.useParams().userId));

  if (!user) return null;

  return (
    <div className="flex w-xs flex-col items-center gap-4 border-2 border-red-500">
      <UserPhoto
        monogram={`${user.nameFirst![0]}${user.nameLast![0]}`}
        url={user.image ?? null}
      />
      <UserName />
      <div>Contact information</div>
    </div>
  );
}

function UserName() {
  // Queries
  const { data: user } = useQuery(userByIdQuery(Route.useParams().userId));

  if (!user) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-semibold">{user.display}</span>
      <div className="flex flex-wrap gap-2 [&_span]:rounded-sm [&_span]:bg-slate-100 [&_span]:px-1 [&_span]:py-0.5">
        <span>{user.role}</span>
        <span>{user.userTypeDisplay ?? 'NO USER TYPE DEFINED'}</span>
      </div>
    </div>
  );
}

function UserPhoto({
  monogram,
  url,
}: {
  monogram: string;
  url: string | null;
}) {
  return (
    <div className="flex size-36 items-center justify-center overflow-hidden rounded-full border-6 border-blue-500 bg-blue-100 shadow-xl">
      {url ? (
        <img src={url} className="" />
      ) : (
        <span className="text-5xl font-bold text-blue-800">{monogram}</span>
      )}
    </div>
  );
}
