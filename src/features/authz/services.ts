import { authorizationRepository as authz } from '~/features/authz/repository';

export const authorizationService = {
  getAllSystemRoles: async () => {
    return await authz.getAllSystemRoles();
  },
  getAllUserTypes: async () => {
    return await authz.getAllUserTypes();
  },
};
