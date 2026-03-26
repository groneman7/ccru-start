import { db } from '~/server/db';
import {
  systemRolesInAuthz as systemRoles,
  userTypesInAuthz as userTypes,
} from '~/server/db/schema';

export const authorizationRepository = {
  allSystemRoles: async () => {
    const rows = await db.select().from(systemRoles);

    return rows;
  },
  allUserTypes: async () => {
    const rows = await db.select().from(userTypes);

    return rows;
  },
};
