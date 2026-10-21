import { queryOptions } from '@tanstack/react-query';
import { userCertificationServerFns } from '~/features/user-certifications/functions';

export function userCertificationsQuery(userId: string) {
  return queryOptions({
    queryKey: ['user-certifications', userId],
    queryFn: () => userCertificationServerFns.list({ data: { userId } }),
  });
}
