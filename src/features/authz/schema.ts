import { object, string, uuidv7 } from 'zod';

export const systemRoleSchema = object({
  id: uuidv7(),
  name: string(),
  display: string(),
});

export const userTypeSchema = object({
  id: uuidv7(),
  name: string(),
  display: string(),
});
