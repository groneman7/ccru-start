import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CertificationEditor } from '~/features/users/certification-editor';
import { certificationServerFns } from '~/features/users/functions';
import { allCertificationsQuery } from '~/features/users/queries';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute('/_authed/admin/certifications/new')({
  component: NewCertificationPage,
});
function NewCertificationPage() {
  const { currentUser } = Route.useRouteContext();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data: certifications = [] } = useQuery(allCertificationsQuery());
  return (
    <CertificationEditor
      certifications={certifications}
      canManage={getUserPermissions(currentUser).can('create', 'Certification')}
      onSave={async (data) => {
        const created = await certificationServerFns.create({ data });
        await client.invalidateQueries({
          queryKey: allCertificationsQuery().queryKey,
        });
        await navigate({
          to: '/admin/certifications/$certificationId',
          params: { certificationId: created.id },
        });
      }}
    />
  );
}
