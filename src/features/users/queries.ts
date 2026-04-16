import { queryOptions } from '@tanstack/react-query';
import {
  certificationServerFns as certification,
  userServerFns as user,
} from '~/features/users/functions';

export function allCertificationsQuery() {
  return queryOptions({
    queryKey: ['allCertifications'],
    queryFn: () => certification.all(),
    initialData: [],
  });
}

export function getCertificationByIdQuery(certificationId: string) {
  return queryOptions({
    queryKey: ['certificationById', certificationId],
    queryFn: () => certification.byId({ data: { certificationId } }),
  });
}

export function allUsersQuery() {
  return queryOptions({
    queryKey: ['allUsers'],
    queryFn: () => user.all(),
  });
}

export function allUsersForComboboxQuery() {
  return queryOptions({
    queryKey: ['allUsersForCombobox'],
    queryFn: () => user.allForCombobox(),
  });
}
