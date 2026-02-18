import { userSchema } from '~/features/admin/users.schema';
import { array, number, object, string, uuidv7 } from 'zod';

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
  quantity: number().int().positive(),
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

export const createTemplatePositionsSchema = object({
  templateId: uuidv7(),
  templatePositionsToCreate: array(
    object({
      positionId: uuidv7(),
      quantity: number().int().positive(),
    }),
  ),
});

export const templateSchemaWithPositions = templateSchema.extend({
  positions: array(
    positionSchema.extend({
      junctionId: uuidv7(),
      quantity: number().int().positive(),
    }),
  ),
});
