import { createServerFn } from '@tanstack/react-start';
import { authorizationService as authz } from '~/features/authz/services';

const getAllSystemRolesServerFn = createServerFn().handler(async () => {
  return await authz.getAllSystemRoles();
});

const getAllUserTypesServerFn = createServerFn().handler(async () => {
  return await authz.getAllUserTypes();
});

export const authorizationServerFns = {
  getAllSystemRoles: getAllSystemRolesServerFn,
  getAllUserTypes: getAllUserTypesServerFn,
};
