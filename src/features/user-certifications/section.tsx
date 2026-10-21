import { subject } from '@casl/ability';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userCertificationServerFns } from '~/features/user-certifications/functions';
import { UserCertificationPanel } from '~/features/user-certifications/panel';
import { userCertificationsQuery } from '~/features/user-certifications/queries';
import { allCertificationsQuery } from '~/features/users/queries';
import type { CurrentUser } from '~/server/auth';
import { getUserPermissions } from '~/server/permissions';

export function UserCertificationSection({
  userId,
  currentUser,
}: {
  userId: string;
  currentUser: CurrentUser;
}) {
  const client = useQueryClient();
  const permissions = getUserPermissions(currentUser);
  const {
    data: records = [],
    isPending,
    error,
  } = useQuery(userCertificationsQuery(userId));
  const { data: definitions = [], error: catalogError } = useQuery(
    allCertificationsQuery(),
  );
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: userCertificationsQuery(userId).queryKey,
      }),
      client.invalidateQueries({ queryKey: ['inbox'] }),
    ]);
  }
  if (isPending) return <p>Loading certifications…</p>;
  if (error || catalogError)
    return <p role="alert">{(error || catalogError)?.message}</p>;
  return (
    <UserCertificationPanel
      records={records.map((record) => ({
        ...record,
        editable:
          ['pending', 'rejected'].includes(record.status) &&
          permissions.can(
            'edit',
            subject('UserCertification', { userId, status: record.status }),
          ),
        removable: permissions.can(
          'remove',
          subject('UserCertification', { userId, status: record.status }),
        ),
      }))}
      definitions={definitions}
      canSubmit={permissions.can(
        'submit',
        subject('UserCertification', { userId }),
      )}
      canReview={permissions.can('review', 'UserCertification')}
      onCreate={async (certificationId) => {
        await userCertificationServerFns.create({
          data: { userId, certificationId },
        });
        await refresh();
      }}
      onEdit={async (data) => {
        await userCertificationServerFns.edit({ data });
        await refresh();
      }}
      onRemove={async (data) => {
        await userCertificationServerFns.remove({ data });
        await refresh();
      }}
    />
  );
}
