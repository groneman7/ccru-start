import {
  eventRepository as event,
  positionRepository as position,
  shiftRepository as shift,
  slotRepository as slot,
} from '~/features/calendar/calendar.repository';
import type { infer as Infer } from 'zod';
import type {
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  updateEventSchema,
  updatePositionDetailsSchema,
} from './calendar.schema';

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
  byEventId: async (input: { eventId: string }) => {
    // Returns a list of slots grouped by shift for a given event.
    const { eventId } = input;
    const data = await slot.byEventId({ eventId });

    const dto = Array.from(
      data.reduce(
        (map, row) => {
          const _shift = map.get(row.shiftId) ?? {
            id: row.shiftId,
            quantity: row.quantity,
            position: {
              id: row.positionId,
              name: row.positionName,
              display: row.positionDisplay,
              description: row.positionDescription,
            },
            slots: [] as Array<{
              id: string;
              user: {
                id: string;
                displayName: string;
                image: string | null;
              };
            }>,
          };

          if (row.slotId && row.userId && row.userDisplayName) {
            _shift.slots.push({
              id: row.slotId,
              user: {
                id: row.userId,
                displayName: row.userDisplayName,
                image: row.userImage,
              },
            });
          }

          map.set(row.shiftId, _shift);
          return map;
        },
        new Map<
          string,
          {
            id: string;
            quantity: number;
            position: {
              id: string;
              name: string;
              display: string;
              description: string | null;
            };
            slots: Array<{
              id: string;
              user: {
                id: string;
                displayName: string;
                image: string | null;
              };
            }>;
          }
        >(),
      ),
    ).map(([, _shift]) => _shift);

    return dto;
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
