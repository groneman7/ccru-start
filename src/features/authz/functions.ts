import { createServerFn } from '@tanstack/react-start';
import {
  createUserTypeSchema,
  renameUserTypeSchema,
} from '~/features/authz/schema';
import {
  authorizationService as authz,
  userTypeService as types,
} from '~/features/authz/services';
import { requirePermission } from '~/server/permissions/require-permission';
import { object, uuidv7 } from 'zod';

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

const createUserTypeServerFn = createServerFn({ method: 'POST' })
  .validator(createUserTypeSchema)
  .handler(async ({ data }) => {
    await requirePermission('create', 'UserType');
    return types.create(data);
  });
const renameUserTypeServerFn = createServerFn({ method: 'POST' })
  .validator(renameUserTypeSchema)
  .handler(async ({ data }) => {
    await requirePermission('update', 'UserType');
    return types.rename(data);
  });
const removeUserTypeServerFn = createServerFn({ method: 'POST' })
  .validator(object({ userTypeId: uuidv7() }).strict())
  .handler(async ({ data }) => {
    await requirePermission('delete', 'UserType');
    return types.remove(data);
  });
export const userTypeServerFns = {
  remove: removeUserTypeServerFn,
  all: getAllUserTypesServerFn,
  create: createUserTypeServerFn,
  rename: renameUserTypeServerFn,
};
