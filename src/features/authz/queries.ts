import { queryOptions } from '@tanstack/react-query';
import { authorizationServerFns as authz } from '~/features/authz/functions';

export function allSystemRolesQuery() {
  return queryOptions({
    queryKey: ['allSystemRoles'],
    queryFn: () => authz.allSystemRoles(),
  });
}

export function allUserTypesQuery() {
  return queryOptions({
    queryKey: ['allUserTypes'],
    queryFn: () => authz.allUserTypes(),
  });
}
