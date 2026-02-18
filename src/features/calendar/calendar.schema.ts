import { userSchema } from '~/features/admin/users.schema';
import {
  array,
  iso,
  number,
  object,
  string,
  union,
  uuidv7,
  null as zNull,
} from 'zod';

// Events ---------------------------------------------------------------------

export const eventSchema = object({
  id: uuidv7(),
  name: string().min(1),
  description: string().nullable(),
  location: string().nullable(),
  timeBegin: string(),
  timeEnd: string().nullable(),
  createdBy: uuidv7().nullable(),
});

export const createEventSchema = eventSchema.omit({
  id: true,
});

export const updateEventSchema = object({
  eventId: uuidv7(),
  data: eventSchema
    .omit({
      id: true,
      createdBy: true,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be updated',
    }),
});

// Positions ------------------------------------------------------------------

export const positionSchema = object({
  id: uuidv7(),
  name: string().min(1),
  display: string().min(1),
  description: string().nullable(),
});

export const createPositionSchema = positionSchema.omit({
  id: true,
});

export const updatePositionDetailsSchema = object({
  positionId: uuidv7(),
  data: positionSchema
    .omit({
      id: true,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be updated',
    }),
});

// Shifts ---------------------------------------------------------------------

export const shiftSchema = object({
  id: uuidv7(),
  eventId: uuidv7(),
  positionId: uuidv7(),
  quantity: number().min(1),
  status: string(),
});

export const createShiftSchema = object({
  eventId: uuidv7(),
  shiftsToCreate: array(
    shiftSchema.pick({
      positionId: true,
      quantity: true,
    }),
  ),
});

export const updateShiftSchema = object({
  shiftId: uuidv7(),
  data: shiftSchema
    .omit({
      id: true,
      status: true,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be updated',
    }),
});

// Slots ----------------------------------------------------------------------

export const slotSchema = object({
  id: uuidv7(),
  shiftId: uuidv7(),
  user: userSchema.pick({
    id: true,
    displayName: true,
    image: true,
    nameFirst: true,
    nameLast: true,
  }),
  status: string(),
});

export const shiftSchemaWithSlots = shiftSchema.omit({ status: true }).extend({
  position: positionSchema,
  slots: array(slotSchema.omit({ shiftId: true, status: true })),
});

export const createSlotSchema = object({
  shiftId: uuidv7(),
  userId: uuidv7(),
});

// Templates ------------------------------------------------------------------

export const templateSchema = object({
  id: uuidv7(),
  name: string().min(1),
  display: string().min(1),
  description: string().nullable(),
  timeBegin: string(),
  timeEnd: string().nullable(),
  location: string().nullable(),
});

export const createTemplateSchema = templateSchema.omit({
  id: true,
});

const timeSchema = string().regex(
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
  'Time must be in HH:MM or HH:MM:SS format.',
);

export const createTemplateDetailsSchema = object({
  eventName: string().min(1),
  description: union([string(), zNull()]),
  location: union([string(), zNull()]),
  timeBegin: timeSchema,
  timeEnd: union([timeSchema, zNull()]),
});

export const updateTemplateSchema = object({
  templateId: uuidv7(),
  data: templateSchema
    .omit({
      id: true,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be updated',
    }),
});

export const templatePositionSchema = object({
  id: uuidv7(),
  quantity: number().int().positive(),
  position: positionSchema,
});

export const createTemplatePositionsSchema = object({
  templateId: uuidv7(),
  templatePositionsToCreate: array(
    object({
      positionId: uuidv7(),
      quantity: number().int().positive(),
    }),
  ),
});

export const updateTemplateDetailsSchema = object({
  templateId: uuidv7(),
  name: string().min(1).optional(),
  eventName: string().min(1).optional(),
  description: union([string(), zNull()]).optional(),
  location: union([string(), zNull()]).optional(),
  timeBegin: timeSchema.optional(),
  timeEnd: union([timeSchema, zNull()]).optional(),
});

export const updateTemplatePositionQuantitySchema = object({
  templatePositionId: uuidv7(),
  quantity: number().int().positive(),
});

export const createEventFromTemplateSchema = object({
  templateId: uuidv7(),
  date: iso.date(),
  createdBy: uuidv7(),
});
