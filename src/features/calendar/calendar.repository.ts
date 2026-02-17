import { db } from '~/server/db';
import {
  eventsInCalendar as events,
  positionsInCalendar as positions,
  junctionShiftsInCalendar as shifts,
  junctionSlotsInCalendar as slots,
  userInBetterAuth as users,
} from '~/server/db/schema';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import type { infer as Infer } from 'zod';
import type {
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  updateEventSchema,
  updatePositionDetailsSchema,
} from './calendar.schema';

// Events ---------------------------------------------------------------------

export const eventRepository = {
  byId: async (input: { eventId: string }) => {
    const { eventId } = input;
    const [row] = await db.select().from(events).where(eq(events.id, eventId));

    return row;
  },
  byMonth: async (input: { month: number; year: number }) => {
    const { month, year } = input;

    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();

    const rows = await db
      .select()
      .from(events)
      .where(and(gte(events.timeBegin, start), lt(events.timeBegin, end)));

    return rows;
  },
  create: async (input: Infer<typeof createEventSchema>) => {
    const [row] = await db
      .insert(events)
      .values(input)
      .returning({ id: events.id });

    return row;
  },
  update: async (input: Infer<typeof updateEventSchema>) => {
    const { eventId, data } = input;
    const [row] = await db
      .update(events)
      .set(data)
      .where(eq(events.id, eventId))
      .returning({ id: events.id });

    return row;
  },
};

// Positions ------------------------------------------------------------------

export const positionRepository = {
  all: async () => {
    const rows = await db.select().from(positions);

    return rows;
  },
  byId: async (input: { positionId: string }) => {
    const { positionId } = input;
    const [row] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId));

    return row;
  },
  create: async (input: Infer<typeof createPositionSchema>) => {
    const [row] = await db
      .insert(positions)
      .values(input)
      .returning({ id: positions.id });

    return row;
  },
  update: async (input: Infer<typeof updatePositionDetailsSchema>) => {
    const { positionId, data } = input;
    const [row] = await db
      .update(positions)
      .set(data)
      .where(eq(positions.id, positionId))
      .returning({ id: positions.id });

    return row;
  },
};

// Shifts ---------------------------------------------------------------------

export const shiftRepository = {
  create: async (input: Infer<typeof createShiftSchema>) => {
    const { eventId, shiftsToCreate } = input;
    const rows = await db
      .insert(shifts)
      .values(
        shiftsToCreate.map((s) => ({
          eventId,
          positionId: s.positionId,
          quantity: s.quantity,
        })),
      )
      .returning({ id: shifts.id });

    return rows;
  },
  delete: async (input: { shiftId: string }) => {
    const { shiftId } = input;
    const [row] = await db
      .delete(shifts)
      .where(eq(shifts.id, shiftId))
      .returning({ id: shifts.id });

    return row;
  },
  getQuantity: async (input: { shiftId: string }) => {
    const { shiftId } = input;
    const [row] = await db
      .select({ quantity: shifts.quantity })
      .from(shifts)
      .where(eq(shifts.id, shiftId));

    return row.quantity;
  },
  updateSlotQuantity: async (input: { shiftId: string; quantity: number }) => {
    const { shiftId, quantity } = input;
    const [row] = await db
      .update(shifts)
      .set({ quantity })
      .where(eq(shifts.id, shiftId))
      .returning({ id: shifts.id });

    return row;
  },
};

// Slots ----------------------------------------------------------------------

export const slotRepository = {
  countActiveSlots: async (input: { shiftId: string }) => {
    const { shiftId } = input;

    const [rowCount] = await db
      .select({ value: count() })
      .from(slots)
      .where(and(eq(slots.shiftId, shiftId), eq(slots.status, 'active')));

    return rowCount.value;
  },
  byEventId: async (input: { eventId: string }) => {
    const { eventId } = input;

    const rows = await db
      .select({
        shiftId: shifts.id,
        eventId: shifts.eventId,
        quantity: shifts.quantity,
        positionId: positions.id,
        positionName: positions.name,
        positionDisplay: positions.display,
        positionDescription: positions.description,
        slotId: slots.id,
        userId: users.id,
        userFirstName: users.nameFirst,
        userLastName: users.nameLast,
        userDisplayName: users.displayName,
        userImage: users.image,
      })
      .from(shifts)
      .innerJoin(positions, eq(shifts.positionId, positions.id))
      .leftJoin(
        slots,
        and(eq(shifts.id, slots.shiftId), eq(slots.status, 'active')),
      )
      .leftJoin(users, eq(slots.userId, users.id))
      .where(and(eq(shifts.eventId, eventId), eq(shifts.status, 'active')));

    return rows;
  },
  create: async (input: Infer<typeof createSlotSchema>) => {
    const { shiftId, userId } = input;
    const [row] = await db
      .insert(slots)
      .values({ shiftId, userId })
      .returning({ id: slots.id });

    return row;
  },
  delete: async (input: { slotId: string }) => {
    const { slotId } = input;
    const [row] = await db
      .delete(slots)
      .where(eq(slots.id, slotId))
      .returning({ id: slots.id });

    return row;
  },
  reassignUser: async (input: { slotId: string; userId: string }) => {
    const { slotId, userId } = input;
    const [row] = await db
      .update(slots)
      .set({ userId })
      .where(eq(slots.id, slotId))
      .returning({ id: slots.id });

    return row;
  },
};
