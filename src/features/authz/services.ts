import {
  authorizationRepository as authz,
  userTypeRepository as types,
} from '~/features/authz/repository';

export const authorizationService = {
  getAllSystemRoles: async () => {
    return await authz.getAllSystemRoles();
  },
  getAllUserTypes: async () => {
    return await authz.getAllUserTypes();
  },
};

export const userTypeService = {
  remove: (input: { userTypeId: string }) => types.remove(input),
  create: (input: { display: string }) => types.create(input),
  rename: (input: { userTypeId: string; display: string }) =>
    types.rename(input),
};
