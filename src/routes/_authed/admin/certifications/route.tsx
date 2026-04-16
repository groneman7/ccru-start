import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { Button } from '~/components/ui';
import { buildCertificationTree } from '~/features/users/certifications';
import { allCertificationsQuery } from '~/features/users/queries';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/admin/certifications')({
  component: CertificationsRouteLayout,
});

function CertificationsRouteLayout() {
  const selectedId = useParams({
    from: '/_authed/admin/certifications/$certificationId',
    shouldThrow: false,
  })?.certificationId;

  const { data: allCertifications } = useQuery(allCertificationsQuery());
  const orderedCertifications = buildCertificationTree(allCertifications);

  return (
    <>
      <WorkspaceHeader>Certifications</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <div className="flex w-xs flex-col overflow-clip rounded border">
          <Link className="flex" to="/admin/certifications/new">
            <Button className="m-1 flex-1" variant="ghost">
              <IconPlus />
              Add certification
            </Button>
          </Link>
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
              <span className="block truncate">{certification.name}</span>
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
