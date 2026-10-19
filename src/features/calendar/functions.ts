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
import { requirePermission } from '~/server/permissions/require-permission';
import { iso, number, object, uuidv7 } from 'zod';

// Events ---------------------------------------------------------------------

const createEventServerFn = createServerFn({ method: 'POST' })
  .validator(createEventSchema)
  .handler(async ({ data }) => {
    const { actor } = await requirePermission('create', 'CalendarEvent');
    return event.create({ ...data, createdBy: actor.id });
  });

const createEventFromTemplateServerFn = createServerFn({ method: 'POST' })
  .validator(
    object({
      templateId: uuidv7(),
      date: iso.date(),
      createdBy: uuidv7(),
    }),
  )
  .handler(async ({ data }) => {
    const { actor } = await requirePermission('create', 'CalendarEvent');
    return event.createFromTemplate({ ...data, createdBy: actor.id });
  });

const getEventByIdServerFn = createServerFn()
  .validator(object({ eventId: uuidv7() }))
  .handler(async ({ data: { eventId } }) => {
    await requirePermission('read', 'CalendarEvent');
    return await event.byId({ eventId });
  });

const getEventsByMonthServerFn = createServerFn()
  .validator(object({ month: number(), year: number() }))
  .handler(async ({ data: { month, year } }) => {
    await requirePermission('read', 'CalendarEvent');
    return await event.byMonth({ month, year });
  });

const updateEventServerFn = createServerFn({ method: 'POST' })
  .validator(updateEventSchema)
  .handler(async ({ data }) => {
    await requirePermission('update', 'CalendarEvent');
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
  await requirePermission('read', 'Position');
  return await position.all();
});

const createPositionServerFn = createServerFn({ method: 'POST' })
  .validator(createPositionSchema)
  .handler(async ({ data }) => {
    await requirePermission('create', 'Position');
    return position.create(data);
  });

const getPositionByIdServerFn = createServerFn()
  .validator(object({ positionId: uuidv7() }))
  .handler(async ({ data: { positionId } }) => {
    await requirePermission('read', 'Position');
    return await position.byId({ positionId });
  });

const updatePositionServerFn = createServerFn({ method: 'POST' })
  .validator(updatePositionDetailsSchema)
  .handler(async ({ data }) => {
    await requirePermission('update', 'Position');
    return await position.update(data);
  });

export const positionServerFns = {
  all: allPositionsServerFn,
  byId: getPositionByIdServerFn,
  create: createPositionServerFn,
  update: updatePositionServerFn,
};

// Shifts ---------------------------------------------------------------------

const createShiftServerFn = createServerFn({ method: 'POST' })
  .validator(createShiftSchema)
  .handler(async ({ data }) => {
    await requirePermission('create', 'Shift');
    return shift.create(data);
  });

const deleteShiftServerFn = createServerFn({ method: 'POST' })
  .validator(object({ shiftId: uuidv7() }))
  .handler(async ({ data: { shiftId } }) => {
    await requirePermission('delete', 'Shift');
    return await shift.delete({ shiftId });
  });

const updateSlotQuantityServerFn = createServerFn({ method: 'POST' })
  .validator(object({ shiftId: uuidv7(), quantity: number() }))
  .handler(async ({ data }) => {
    await requirePermission('modify', 'Shift');
    return await shift.updateSlotQuantity(data);
  });

export const shiftServerFns = {
  create: createShiftServerFn,
  delete: deleteShiftServerFn,
  updateSlotQuantity: updateSlotQuantityServerFn,
};

// Slots ----------------------------------------------------------------------

const assignUserServerFn = createServerFn({ method: 'POST' })
  .validator(object({ shiftId: uuidv7(), userId: uuidv7() }))
  .handler(async ({ data }) => {
    await requirePermission('create', 'Slot');
    return await slot.assignUser(data);
  });

const getSlotsByEventServerFn = createServerFn()
  .validator(object({ eventId: uuidv7() }))
  .handler(async ({ data: { eventId } }) => {
    await requirePermission('read', 'Slot');
    return await slot.byEventId({ eventId });
  });

const createSlotServerFn = createServerFn({ method: 'POST' })
  .validator(createSlotSchema)
  .handler(async ({ data }) => {
    await requirePermission('create', 'Slot');
    return slot.create(data);
  });

const deleteSlotServerFn = createServerFn({ method: 'POST' })
  .validator(object({ slotId: uuidv7() }))
  .handler(async ({ data: { slotId } }) => {
    await requirePermission('delete', 'Slot');
    return await slot.delete({ slotId });
  });

const reassignUserServerFn = createServerFn({ method: 'POST' })
  .validator(object({ slotId: uuidv7(), userId: uuidv7() }))
  .handler(async ({ data }) => {
    await requirePermission('update', 'Slot');
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
  await requirePermission('read', 'Template');
  return await template.all();
});

const getTemplateByIdServerFn = createServerFn()
  .validator(object({ templateId: uuidv7() }))
  .handler(async ({ data }) => {
    await requirePermission('read', 'Template');
    return await template.byId(data);
  });

const createTemplatePositionsServerFn = createServerFn({ method: 'POST' })
  .validator(createTemplatePositionsSchema)
  .handler(async ({ data }) => {
    await requirePermission('update', 'Template');
    return await template.createTemplatePositions(data);
  });

const deleteTemplatePositionServerFn = createServerFn({ method: 'POST' })
  .validator(object({ templatePositionId: uuidv7() }))
  .handler(async ({ data }) => {
    await requirePermission('update', 'Template');
    return await template.deleteTemplatePosition(data);
  });

const updateTemplateDetailsServerFn = createServerFn({ method: 'POST' })
  .validator(updateTemplateSchema)
  .handler(async ({ data }) => {
    await requirePermission('update', 'Template');
    return await template.updateDetails(data);
  });

const updateTemplatePositionQuantityServerFn = createServerFn({
  method: 'POST',
})
  .validator(object({ templatePositionId: uuidv7(), quantity: number() }))
  .handler(async ({ data }) => {
    await requirePermission('update', 'Template');
    return await template.updatePositionQuantity(data);
  });

//  const createEventFromTemplateServerFn = createServerFn()
//   .validator(createEventFromTemplateSchema)
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
