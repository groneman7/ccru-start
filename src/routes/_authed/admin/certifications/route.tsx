import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { buildCertificationTree } from '~/features/users/certifications';
import { allCertificationsQuery } from '~/features/users/queries';
import { cn } from '~/lib/utils';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute('/_authed/admin/certifications')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(allCertificationsQuery()),
  component: CertificationsRouteLayout,
});

function CertificationsRouteLayout() {
  const { currentUser } = Route.useRouteContext();
  const selectedId = useParams({
    from: '/_authed/admin/certifications/$certificationId',
    shouldThrow: false,
  })?.certificationId;

  const { data: allCertifications = [] } = useQuery(allCertificationsQuery());
  const orderedCertifications = buildCertificationTree(allCertifications);

  return (
    <>
      <WorkspaceHeader>Certifications</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <div className="flex w-xs flex-col overflow-clip rounded border">
          {getUserPermissions(currentUser).can('create', 'Certification') && (
            <Link
              className="m-1 flex items-center gap-2 rounded p-2 hover:bg-accent"
              to="/admin/certifications/new"
            >
              <IconPlus />
              Add certification
            </Link>
          )}
          {orderedCertifications.map(({ certification, depth }) => (
            <Link
              key={certification.id}
              className={cn(
                'block px-2 py-1',
                certification.id === selectedId &&
                  'bg-accent font-semibold text-accent-foreground',
              )}
              style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
              to="/admin/certifications/$certificationId"
              params={{ certificationId: certification.id }}
            >
              <span className="block truncate">{certification.display}</span>
              {depth > 0 && (
                <span className="block text-xs text-muted-foreground">
                  child certification
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex flex-2 flex-col">
          <Outlet />
        </div>
      </WorkspaceContent>
    </>
  );
}
