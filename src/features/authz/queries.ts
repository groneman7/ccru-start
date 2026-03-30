import { queryOptions } from '@tanstack/react-query';
import { authorizationServerFns as authz } from '~/features/authz/functions';

export function allSystemRolesQuery() {
  return queryOptions({
    queryKey: ['allSystemRoles'],
    queryFn: () => authz.getAllSystemRoles(),
  });
}

export function allUserTypesQuery() {
  return queryOptions({
    queryKey: ['allUserTypes'],
    queryFn: () => authz.getAllUserTypes(),
  });
}
