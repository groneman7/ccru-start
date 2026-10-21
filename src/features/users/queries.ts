import { queryOptions } from '@tanstack/react-query';
import {
  certificationServerFns as certification,
  userServerFns as user,
} from '~/features/users/functions';

// Certifications -------------------------------------------------------------

export function allCertificationsQuery() {
  return queryOptions({
    queryKey: ['allCertifications'],
    queryFn: () => certification.all(),
  });
}

export function getCertificationByIdQuery(certificationId: string) {
  return queryOptions({
    queryKey: ['certificationById', certificationId],
    queryFn: () => certification.byId({ data: { certificationId } }),
  });
}

// Users ----------------------------------------------------------------------

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

export function userByIdQuery(userId: string) {
  return queryOptions({
    queryKey: ['userById', userId],
    queryFn: () => user.byId({ data: { userId } }),
  });
}
