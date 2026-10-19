import { object, string, uuidv7 } from 'zod';

export { SYSTEM_ROLES } from '~/server/permissions/policy';

export const userTypeSchema = object({
  id: uuidv7(),
  name: string(),
  display: string(),
});
