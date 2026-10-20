import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { authSessionQueryKey } from '~/features/auth/queries';
import { userTypeServerFns } from '~/features/authz/functions';
import { allUserTypesQuery } from '~/features/authz/queries';
import { UserTypeManagement } from '~/features/authz/user-type-management';
import { allUsersQuery } from '~/features/users/queries';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute('/_authed/admin/user-types')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(allUserTypesQuery());
  },
  component: UserTypesPage,
});
function UserTypesPage() {
  const { currentUser } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: types = [] } = useQuery(allUserTypesQuery());
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: allUserTypesQuery().queryKey }),
      queryClient.invalidateQueries({ queryKey: allUsersQuery().queryKey }),
      queryClient.invalidateQueries({ queryKey: ['userById'] }),
      queryClient.invalidateQueries({ queryKey: authSessionQueryKey }),
    ]);
    await router.invalidate();
  }
  return (
    <>
      <WorkspaceHeader>User types</WorkspaceHeader>
      <WorkspaceContent>
        <UserTypeManagement
          types={types
            .slice()
            .sort((a, b) => a.display.localeCompare(b.display))}
          canManage={getUserPermissions(currentUser).can('create', 'UserType')}
          onCreate={async (display) => {
            await userTypeServerFns.create({ data: { display } });
            await refresh();
          }}
          onRename={async (userTypeId, display) => {
            await userTypeServerFns.rename({ data: { userTypeId, display } });
            await refresh();
          }}
          onRemove={async (userTypeId) => {
            await userTypeServerFns.remove({ data: { userTypeId } });
            await refresh();
          }}
        />
      </WorkspaceContent>
    </>
  );
}
