import { createServerFn } from '@tanstack/react-start';
import { authorizationService as authz } from '~/features/authz/services';
import { requireAuthority } from '~/server/authority';

const getAllSystemRolesServerFn = createServerFn().handler(async () => {
  await requireAuthority('authenticated');
  return await authz.getAllSystemRoles();
});

const getAllUserTypesServerFn = createServerFn().handler(async () => {
  await requireAuthority('authenticated');
  return await authz.getAllUserTypes();
});

export const authorizationServerFns = {
  getAllSystemRoles: getAllSystemRolesServerFn,
  getAllUserTypes: getAllUserTypesServerFn,
};
