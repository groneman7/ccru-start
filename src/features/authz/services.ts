import { authorizationRepository as authz } from '~/features/authz/repository';

export const authorizationService = {
  allSystemRoles: async () => {
    return await authz.allSystemRoles();
  },
  allUserTypes: async () => {
    return await authz.allUserTypes();
  },
};
