import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CertificationEditor } from '~/features/users/certification-editor';
import { certificationServerFns } from '~/features/users/functions';
import {
  allCertificationsQuery,
  getCertificationByIdQuery,
} from '~/features/users/queries';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute(
  '/_authed/admin/certifications/$certificationId',
)({
  loader: async ({ context: { queryClient }, params: { certificationId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getCertificationByIdQuery(certificationId)),
      queryClient.ensureQueryData(allCertificationsQuery()),
    ]);
  },
  component: CertificationPage,
});
function CertificationPage() {
  const { currentUser } = Route.useRouteContext();
  const { certificationId } = Route.useParams();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data: certification } = useQuery(
    getCertificationByIdQuery(certificationId),
  );
  const { data: certifications = [] } = useQuery(allCertificationsQuery());
  if (!certification) return null;
  return (
    <CertificationEditor
      certification={certification}
      certifications={certifications}
      canManage={getUserPermissions(currentUser).can('update', 'Certification')}
      onSave={async (data) => {
        await certificationServerFns.update({
          data: { certificationId, data },
        });
        await Promise.all([
          client.invalidateQueries({
            queryKey: allCertificationsQuery().queryKey,
          }),
          client.invalidateQueries({
            queryKey: getCertificationByIdQuery(certificationId).queryKey,
          }),
        ]);
      }}
      onRemove={async () => {
        await certificationServerFns.remove({ data: { certificationId } });
        await client.invalidateQueries({
          queryKey: allCertificationsQuery().queryKey,
        });
        await navigate({ to: '/admin/certifications' });
        client.removeQueries({
          queryKey: getCertificationByIdQuery(certificationId).queryKey,
        });
      }}
    />
  );
}
