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
  userId: uuidv7(),
  status: string(),
});

export const createSlotSchema = slotSchema.pick({
  shiftId: true,
  userId: true,
});
