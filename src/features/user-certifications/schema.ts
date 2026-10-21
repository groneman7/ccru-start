import { number, object, string, uuidv7, enum as zodEnum } from 'zod';

export const createUserCertificationSchema = object({
  userId: uuidv7(),
  certificationId: uuidv7(),
}).strict();
export const changeUserCertificationSchema = object({
  id: uuidv7(),
  version: number().int().positive(),
  certificationId: uuidv7(),
}).strict();
export const removeUserCertificationSchema = object({
  id: uuidv7(),
  version: number().int().positive(),
}).strict();
export const reviewUserCertificationSchema = removeUserCertificationSchema
  .extend({
    decision: zodEnum(['approve', 'reject']),
    comment: string().trim().max(2000).optional(),
  })
  .strict();
