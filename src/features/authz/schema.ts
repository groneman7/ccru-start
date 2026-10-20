import { object, string, uuidv7 } from 'zod';

export const SYSTEM_ROLES = [
  'User',
  'Officer',
  'Administrator',
  'Developer',
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const userTypeSchema = object({
  id: uuidv7(),
  name: string(),
  display: string(),
});

export const createUserTypeSchema = object({
  display: string().trim().min(1).max(100),
}).strict();
export const renameUserTypeSchema = createUserTypeSchema
  .extend({ userTypeId: uuidv7() })
  .strict();
