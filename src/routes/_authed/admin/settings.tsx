import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { registrationServerFns } from '~/features/registration/functions';
import { RegistrationModeControl } from '~/features/registration/mode-control';
import { registrationModeQuery } from '~/features/registration/queries';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute('/_authed/admin/settings')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(registrationModeQuery()),
  component: SettingsPage,
});
function SettingsPage() {
  const { currentUser } = Route.useRouteContext();
  const client = useQueryClient();
  const { data: mode = 'invitation-only' } = useQuery(registrationModeQuery());
  return (
    <>
      <WorkspaceHeader>Organization settings</WorkspaceHeader>
      <WorkspaceContent>
        <RegistrationModeControl
          mode={mode}
          canEdit={getUserPermissions(currentUser).can(
            'update',
            'RegistrationMode',
          )}
          onSave={async (mode) => {
            await registrationServerFns.updateMode({ data: { mode } });
            await client.invalidateQueries({
              queryKey: registrationModeQuery().queryKey,
            });
          }}
        />
      </WorkspaceContent>
    </>
  );
}
