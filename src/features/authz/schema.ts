import { object, string, uuidv7 } from 'zod';

export const SYSTEM_ROLES = ['User', 'Officer', 'Administrator', 'Developer'];

export const userTypeSchema = object({
  id: uuidv7(),
  name: string(),
  display: string(),
});
