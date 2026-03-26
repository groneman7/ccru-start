import { createServerFn } from '@tanstack/react-start';
import { authorizationService as authz } from '~/features/authz/services';

const allSystemRolesServerFn = createServerFn().handler(async () => {
  return await authz.allSystemRoles();
});

const allUserTypesServerFn = createServerFn().handler(async () => {
  return await authz.allUserTypes();
});

export const authorizationServerFns = {
  allSystemRoles: allSystemRolesServerFn,
  allUserTypes: allUserTypesServerFn,
};
