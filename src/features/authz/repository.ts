import { SYSTEM_ROLES } from '~/features/authz/schema';
import { db } from '~/server/db';
import { userTypesInAuthz as userTypes } from '~/server/db/schema';

export const authorizationRepository = {
  getAllSystemRoles: () => {
    return SYSTEM_ROLES;
  },
  getAllUserTypes: async () => {
    const rows = await db.select().from(userTypes);

    return rows;
  },
};
