import { createServerFn } from '@tanstack/react-start';
import { authorizationService as authz } from '~/features/authz/services';
import { requirePermission } from '~/server/permissions/require-permission';

const getAllSystemRolesServerFn = createServerFn().handler(async () => {
  await requirePermission('read', 'SystemRole');
  return await authz.getAllSystemRoles();
});

const getAllUserTypesServerFn = createServerFn().handler(async () => {
  await requirePermission('read', 'UserType');
  return await authz.getAllUserTypes();
});

export const authorizationServerFns = {
  getAllSystemRoles: getAllSystemRolesServerFn,
  getAllUserTypes: getAllUserTypesServerFn,
};
