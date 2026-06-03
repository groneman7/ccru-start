import {
  boolean,
  email,
  enum as zodEnum,
  nullable,
  object,
  string,
  url,
  uuidv7,
} from 'zod';

export const USER_STATUS_VALUES = ['active', 'inactive', 'invited'] as const;
export const USER_TOGGLEABLE_STATUS_VALUES = ['active', 'inactive'] as const;
export const userStatusSchema = zodEnum(USER_STATUS_VALUES);
export const userToggleableStatusSchema = zodEnum(USER_TOGGLEABLE_STATUS_VALUES);

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
  status: userStatusSchema,
  timestampCreatedAt: string().min(1),
  timestampFirstLogin: string().min(1),
  timestampOnboardingCompleted: string().min(1),
  timestampUpdatedAt: string().min(1),
  role: string().nullable(),
  userTypeId: uuidv7().nullable(),
});

export const certificationSchema = object({
  id: uuidv7(),
  name: string().min(1),
  display: string().min(1),
  parent: nullable(uuidv7()),
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

export const createCertificationSchema = certificationSchema.omit({
  id: true,
});

export const updateCertificationSchema = object({
  certificationId: uuidv7(),
  data: certificationSchema
    .omit({
      id: true,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be updated',
    }),
});
