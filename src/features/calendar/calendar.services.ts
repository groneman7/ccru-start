import {
  eventRepository as event,
  positionRepository as position,
  shiftRepository as shift,
  slotRepository as slot,
  templateRepository as template,
} from '~/features/calendar/calendar.repository';
import {
  shiftSchemaWithSlots,
  templatePositionSchema,
} from '~/features/calendar/calendar.schema';
import type {
  createEventFromTemplateSchema,
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  createTemplateDetailsSchema,
  createTemplatePositionsSchema,
  updateEventSchema,
  updatePositionDetailsSchema,
  updateTemplateDetailsSchema,
  updateTemplatePositionQuantitySchema,
} from '~/features/calendar/calendar.schema';
import { array } from 'zod';
import type { infer as Infer } from 'zod';

// BUSINESS LOGIC (e.g., authorization) GOES IN THIS LAYER!!!

// Events ---------------------------------------------------------------------
export const eventService = {
  byId: async (input: { eventId: string }) => {
    const { eventId } = input;
    return await event.byId({ eventId });
  },
  byMonth: async (input: { month: number; year: number }) => {
    const { month, year } = input;
    return await event.byMonth({ month, year });
  },
  create: async (input: Infer<typeof createEventSchema>) => {
    return await event.create(input);
  },
  update: async (input: Infer<typeof updateEventSchema>) => {
    return await event.update(input);
  },
};

// Positions ------------------------------------------------------------------

export const positionService = {
  all: async () => {
    return await position.all();
  },
  byId: async (input: { positionId: string }) => {
    const { positionId } = input;
    return await position.byId({ positionId });
  },
  create: async (input: Infer<typeof createPositionSchema>) => {
    return await position.create(input);
  },
  update: async (input: Infer<typeof updatePositionDetailsSchema>) => {
    return await position.update(input);
  },
};

// Shifts ---------------------------------------------------------------------

export const shiftService = {
  create: async (input: Infer<typeof createShiftSchema>) => {
    return await shift.create(input);
  },
  delete: async (input: { shiftId: string }) => {
    return await shift.delete(input);
  },
  updateSlotQuantity: async (input: { shiftId: string; quantity: number }) => {
    return await shift.updateSlotQuantity(input);
  },
};

// Slots ----------------------------------------------------------------------

export const slotService = {
  assignUser: async (input: { shiftId: string; userId: string }) => {
    const { shiftId, userId } = input;

    // 1. Insert slot
    const newSlot = await slot.create({ shiftId, userId });

    // 2. Update shift quantity if needed
    const activeSlotCount = await slot.countActiveSlots({ shiftId });
    const shiftSlotQuantity = await shift.getQuantity({ shiftId });
    if (activeSlotCount > shiftSlotQuantity)
      shift.updateSlotQuantity({ shiftId, quantity: activeSlotCount });

    return newSlot;
  },
  byEventId: async (input: {
    eventId: string;
  }): Promise<Infer<typeof shiftSchemaWithSlots>[]> => {
    // Returns a list of slots grouped by shift for a given event.
    const { eventId } = input;
    const data = await slot.byEventId({ eventId });

    type ShiftDto = Infer<typeof shiftSchemaWithSlots>;
    type SlotDto = ShiftDto['slots'][number];

    const dto = Array.from(
      data.reduce((map, row) => {
        const _shift: ShiftDto = map.get(row.shiftId) ?? {
          id: row.shiftId,
          eventId: row.eventId,
          positionId: row.positionId,
          quantity: row.quantity,
          position: {
            id: row.positionId,
            name: row.positionName,
            display: row.positionDisplay,
            description: row.positionDescription,
          },
          slots: [],
        };

        if (row.slotId && row.userId && row.userDisplayName) {
          const slotToAdd: SlotDto = {
            id: row.slotId,
            user: {
              id: row.userId,
              displayName: row.userDisplayName,
              image: row.userImage,
              nameFirst: row.userFirstName,
              nameLast: row.userLastName,
            },
          };
          _shift.slots.push(slotToAdd);
        }

        map.set(row.shiftId, _shift);
        return map;
      }, new Map<string, ShiftDto>()),
    ).map(([, _shift]) => _shift);

    return array(shiftSchemaWithSlots).parse(dto);
  },
  create: async (input: Infer<typeof createSlotSchema>) => {
    return await slot.create(input);
  },
  delete: async (input: { slotId: string }) => {
    return await slot.delete(input);
  },
  reassignUser: async (input: { slotId: string; userId: string }) => {
    return await slot.reassignUser(input);
  },
};

// Templates ------------------------------------------------------------------

export const templateService = {
  all: async () => {
    return await template.all();
  },
  byId: async (input: { templateId: string }) => {
    return await template.byId(input);
  },
  create: async (input: Infer<typeof createTemplateDetailsSchema>) => {
    return await template.createFromDetails(input);
  },
  templatePositionsByTemplateId: async (input: { templateId: string }) => {
    const rows = await template.templatePositionsByTemplateId(input);
    return array(templatePositionSchema).parse(rows);
  },
  createTemplatePositions: async (
    input: Infer<typeof createTemplatePositionsSchema>,
  ) => {
    return await template.createTemplatePositions(input);
  },
  deleteTemplatePosition: async (input: { templatePositionId: string }) => {
    return await template.deleteTemplatePosition(input);
  },
  updateDetails: async (input: Infer<typeof updateTemplateDetailsSchema>) => {
    return await template.updateDetails(input);
  },
  updatePositionQuantity: async (
    input: Infer<typeof updateTemplatePositionQuantitySchema>,
  ) => {
    return await template.updatePositionQuantity(input);
  },
  createEventFromTemplate: async (
    input: Infer<typeof createEventFromTemplateSchema>,
  ) => {
    return await template.createEventFromTemplate(input);
  },
};
