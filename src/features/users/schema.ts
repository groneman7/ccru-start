import { boolean, email, object, string, url, uuidv7 } from 'zod';

export const userSchema = object({
  id: uuidv7(),
  displayName: string().min(1),
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
  systemRoleId: uuidv7().nullable(),
  userTypeId: uuidv7().nullable(),
});

export const userSchemaForCombobox = userSchema.pick({
  id: true,
  displayName: true,
  nameFirst: true,
  nameLast: true,
  systemRoleId: true,
  userTypeId: true,
});

export const createUserSchema = userSchema.pick({
  displayName: true,
  email: true,
  nameFirst: true,
  nameMiddle: true,
  nameLast: true,
  phoneNumber: true,
  postNominals: true,
  systemRoleId: true,
  userTypeId: true,
});

export const updateUserSchema = userSchema
  .pick({
    displayName: true,
    email: true,
    nameFirst: true,
    nameMiddle: true,
    nameLast: true,
    phoneNumber: true,
    postNominals: true,
    systemRoleId: true,
    userTypeId: true,
  })
  .partial();
