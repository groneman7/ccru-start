import { createServerFn } from '@tanstack/react-start';
import {
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  createTemplatePositionsSchema,
  updateEventSchema,
  updatePositionDetailsSchema,
  updateTemplateSchema,
} from '~/features/calendar/calendar.schema';
import {
  eventService as event,
  positionService as position,
  shiftService as shift,
  slotService as slot,
  templateService as template,
} from '~/features/calendar/calendar.services';
import { iso, number, object, uuidv7 } from 'zod';

// Events ---------------------------------------------------------------------

export const createEventServerFn = createServerFn()
  .inputValidator(createEventSchema)
  .handler(async ({ data }) => {
    return event.create(data);
  });

export const createEventFromTemplateServerFn = createServerFn()
  .inputValidator(
    object({
      templateId: uuidv7(),
      date: iso.date(),
      createdBy: uuidv7(),
    }),
  )
  .handler(async ({ data }) => {
    return event.createFromTemplate(data);
  });

export const getEventByIdServerFn = createServerFn()
  .inputValidator(object({ eventId: uuidv7() }))
  .handler(async ({ data: { eventId } }) => {
    return await event.byId({ eventId });
  });

export const getEventsByMonthServerFn = createServerFn()
  .inputValidator(object({ month: number(), year: number() }))
  .handler(async ({ data: { month, year } }) => {
    return await event.byMonth({ month, year });
  });

export const updateEventServerFn = createServerFn()
  .inputValidator(updateEventSchema)
  .handler(async ({ data }) => {
    return await event.update(data);
  });

export const eventServerFns = {
  byId: getEventByIdServerFn,
  byMonth: getEventsByMonthServerFn,
  create: createEventServerFn,
  createFromTemplate: createEventFromTemplateServerFn,
  update: updateEventServerFn,
};

// Positions ------------------------------------------------------------------

export const allPositionsServerFn = createServerFn().handler(async () => {
  return await position.all();
});

export const createPositionServerFn = createServerFn()
  .inputValidator(createPositionSchema)
  .handler(async ({ data }) => {
    return position.create(data);
  });

export const getPositionByIdServerFn = createServerFn()
  .inputValidator(object({ positionId: uuidv7() }))
  .handler(async ({ data: { positionId } }) => {
    return await position.byId({ positionId });
  });

export const updatePositionServerFn = createServerFn()
  .inputValidator(updatePositionDetailsSchema)
  .handler(async ({ data }) => {
    return await position.update(data);
  });

export const positionServerFns = {
  all: allPositionsServerFn,
  byId: getPositionByIdServerFn,
  create: createPositionServerFn,
  update: updatePositionServerFn,
};

// Shifts ---------------------------------------------------------------------

export const createShiftServerFn = createServerFn()
  .inputValidator(createShiftSchema)
  .handler(async ({ data }) => {
    return shift.create(data);
  });

export const deleteShiftServerFn = createServerFn()
  .inputValidator(object({ shiftId: uuidv7() }))
  .handler(async ({ data: { shiftId } }) => {
    return await shift.delete({ shiftId });
  });

export const updateSlotQuantityServerFn = createServerFn()
  .inputValidator(object({ shiftId: uuidv7(), quantity: number() }))
  .handler(async ({ data }) => {
    return await shift.updateSlotQuantity(data);
  });

export const shiftServerFns = {
  create: createShiftServerFn,
  delete: deleteShiftServerFn,
  updateSlotQuantity: updateSlotQuantityServerFn,
};

// Slots ----------------------------------------------------------------------

export const assignUserServerFn = createServerFn()
  .inputValidator(object({ shiftId: uuidv7(), userId: uuidv7() }))
  .handler(async ({ data }) => {
    return await slot.assignUser(data);
  });

export const getSlotsByEventServerFn = createServerFn()
  .inputValidator(object({ eventId: uuidv7() }))
  .handler(async ({ data: { eventId } }) => {
    return await slot.byEventId({ eventId });
  });

export const createSlotServerFn = createServerFn()
  .inputValidator(createSlotSchema)
  .handler(async ({ data }) => {
    return slot.create(data);
  });

export const deleteSlotServerFn = createServerFn()
  .inputValidator(object({ slotId: uuidv7() }))
  .handler(async ({ data: { slotId } }) => {
    return await slot.delete({ slotId });
  });

export const reassignUserServerFn = createServerFn()
  .inputValidator(object({ slotId: uuidv7(), userId: uuidv7() }))
  .handler(async ({ data }) => {
    return await slot.reassignUser(data);
  });

export const slotServerFns = {
  assignUser: assignUserServerFn,
  byEventId: getSlotsByEventServerFn,
  create: createSlotServerFn,
  delete: deleteSlotServerFn,
  reassignUser: reassignUserServerFn,
};

// Templates ------------------------------------------------------------------

export const allTemplatesServerFn = createServerFn().handler(async () => {
  return await template.all();
});

export const getTemplateByIdServerFn = createServerFn()
  .inputValidator(object({ templateId: uuidv7() }))
  .handler(async ({ data }) => {
    return await template.byId(data);
  });

export const createTemplatePositionsServerFn = createServerFn()
  .inputValidator(createTemplatePositionsSchema)
  .handler(async ({ data }) => {
    return await template.createTemplatePositions(data);
  });

export const deleteTemplatePositionServerFn = createServerFn()
  .inputValidator(object({ templatePositionId: uuidv7() }))
  .handler(async ({ data }) => {
    return await template.deleteTemplatePosition(data);
  });

export const updateTemplateDetailsServerFn = createServerFn()
  .inputValidator(updateTemplateSchema)
  .handler(async ({ data }) => {
    return await template.updateDetails(data);
  });

export const updateTemplatePositionQuantityServerFn = createServerFn()
  .inputValidator(object({ templatePositionId: uuidv7(), quantity: number() }))
  .handler(async ({ data }) => {
    return await template.updatePositionQuantity(data);
  });

// export const createEventFromTemplateServerFn = createServerFn()
//   .inputValidator(createEventFromTemplateSchema)
//   .handler(async ({ data }) => {
//     return await template.createEventFromTemplate(data);
//   });

export const templateServerFns = {
  all: allTemplatesServerFn,
  byId: getTemplateByIdServerFn,
  // templatePositionsByTemplateId: getTemplatePositionsByTemplateIdServerFn,
  // create: createTemplateServerFn,
  createTemplatePositions: createTemplatePositionsServerFn,
  deleteTemplatePosition: deleteTemplatePositionServerFn,
  updateDetails: updateTemplateDetailsServerFn,
  updatePositionQuantity: updateTemplatePositionQuantityServerFn,
};
