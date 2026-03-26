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
} from '~/features/calendar/schema';
import {
  eventService as event,
  positionService as position,
  shiftService as shift,
  slotService as slot,
  templateService as template,
} from '~/features/calendar/services';
import { iso, number, object, uuidv7 } from 'zod';

// Events ---------------------------------------------------------------------

const createEventServerFn = createServerFn()
  .inputValidator(createEventSchema)
  .handler(async ({ data }) => {
    return event.create(data);
  });

const createEventFromTemplateServerFn = createServerFn()
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

const getEventByIdServerFn = createServerFn()
  .inputValidator(object({ eventId: uuidv7() }))
  .handler(async ({ data: { eventId } }) => {
    return await event.byId({ eventId });
  });

const getEventsByMonthServerFn = createServerFn()
  .inputValidator(object({ month: number(), year: number() }))
  .handler(async ({ data: { month, year } }) => {
    return await event.byMonth({ month, year });
  });

const updateEventServerFn = createServerFn()
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

const allPositionsServerFn = createServerFn().handler(async () => {
  return await position.all();
});

const createPositionServerFn = createServerFn()
  .inputValidator(createPositionSchema)
  .handler(async ({ data }) => {
    return position.create(data);
  });

const getPositionByIdServerFn = createServerFn()
  .inputValidator(object({ positionId: uuidv7() }))
  .handler(async ({ data: { positionId } }) => {
    return await position.byId({ positionId });
  });

const updatePositionServerFn = createServerFn()
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

const createShiftServerFn = createServerFn()
  .inputValidator(createShiftSchema)
  .handler(async ({ data }) => {
    return shift.create(data);
  });

const deleteShiftServerFn = createServerFn()
  .inputValidator(object({ shiftId: uuidv7() }))
  .handler(async ({ data: { shiftId } }) => {
    return await shift.delete({ shiftId });
  });

const updateSlotQuantityServerFn = createServerFn()
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

const assignUserServerFn = createServerFn()
  .inputValidator(object({ shiftId: uuidv7(), userId: uuidv7() }))
  .handler(async ({ data }) => {
    return await slot.assignUser(data);
  });

const getSlotsByEventServerFn = createServerFn()
  .inputValidator(object({ eventId: uuidv7() }))
  .handler(async ({ data: { eventId } }) => {
    return await slot.byEventId({ eventId });
  });

const createSlotServerFn = createServerFn()
  .inputValidator(createSlotSchema)
  .handler(async ({ data }) => {
    return slot.create(data);
  });

const deleteSlotServerFn = createServerFn()
  .inputValidator(object({ slotId: uuidv7() }))
  .handler(async ({ data: { slotId } }) => {
    return await slot.delete({ slotId });
  });

const reassignUserServerFn = createServerFn()
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

const allTemplatesServerFn = createServerFn().handler(async () => {
  return await template.all();
});

const getTemplateByIdServerFn = createServerFn()
  .inputValidator(object({ templateId: uuidv7() }))
  .handler(async ({ data }) => {
    return await template.byId(data);
  });

const createTemplatePositionsServerFn = createServerFn()
  .inputValidator(createTemplatePositionsSchema)
  .handler(async ({ data }) => {
    return await template.createTemplatePositions(data);
  });

const deleteTemplatePositionServerFn = createServerFn()
  .inputValidator(object({ templatePositionId: uuidv7() }))
  .handler(async ({ data }) => {
    return await template.deleteTemplatePosition(data);
  });

const updateTemplateDetailsServerFn = createServerFn()
  .inputValidator(updateTemplateSchema)
  .handler(async ({ data }) => {
    return await template.updateDetails(data);
  });

const updateTemplatePositionQuantityServerFn = createServerFn()
  .inputValidator(object({ templatePositionId: uuidv7(), quantity: number() }))
  .handler(async ({ data }) => {
    return await template.updatePositionQuantity(data);
  });

//  const createEventFromTemplateServerFn = createServerFn()
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
