import { boolean, email, object, string, url, uuidv7 } from 'zod';

export const userSchema = object({
  id: uuidv7(),
  display: string().min(1),
  email: email().min(1),
  emailVerified: boolean(),
  image: url().nullable(),
  nameFirst: string().min(1).nullable(),
  nameMiddle: string().nullable(),
  nameLast: string().min(1).nullable(),
  phoneNumber: string().nullable(),
  phoneNumberVerified: boolean(),
  postNominals: string().nullable(),
  status: string().min(1),
  timestampCreatedAt: string().min(1),
  timestampFirstLogin: string().min(1),
  timestampOnboardingCompleted: string().min(1),
  timestampUpdatedAt: string().min(1),
  role: string().nullable(),
  userTypeId: uuidv7().nullable(),
});

export const userSchemaForCombobox = userSchema.pick({
  id: true,
  display: true,
  nameFirst: true,
  nameLast: true,
  role: true,
  userTypeId: true,
});

export const createUserSchema = userSchema.pick({
  display: true,
  email: true,
  nameFirst: true,
  nameMiddle: true,
  nameLast: true,
  phoneNumber: true,
  postNominals: true,
  role: true,
  userTypeId: true,
});

export const updateUserSchema = userSchema
  .pick({
    display: true,
    email: true,
    nameFirst: true,
    nameMiddle: true,
    nameLast: true,
    phoneNumber: true,
    postNominals: true,
    role: true,
    userTypeId: true,
  })
  .partial();
