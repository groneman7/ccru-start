import type {
  createEventFromTemplateSchema,
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  createTemplateDetailsSchema,
  createTemplatePositionsSchema,
  createTemplateSchema,
  updateEventSchema,
  updatePositionDetailsSchema,
  updateTemplateDetailsSchema,
  updateTemplatePositionQuantitySchema,
} from '~/features/calendar/calendar.schema';
import { db } from '~/server/db';
import {
  eventsInCalendar as events,
  positionsInCalendar as positions,
  junctionShiftsInCalendar as shifts,
  junctionSlotsInCalendar as slots,
  junctionTemplatePositionsInCalendar as templatePositions,
  templatesInCalendar as templates,
  userInBetterAuth as users,
} from '~/server/db/schema';
import dayjs from 'dayjs';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import type { infer as Infer } from 'zod';

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

// Templates ------------------------------------------------------------------

export const templateRepository = {
  all: async () => {
    const rows = await db.select().from(templates);

    return rows;
  },
  byId: async (input: { templateId: string }) => {
    const { templateId } = input;
    const [row] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId));

    return row;
  },
  create: async (input: Infer<typeof createTemplateSchema>) => {
    const [row] = await db
      .insert(templates)
      .values(input)
      .returning({ id: templates.id });

    return row;
  },
  createFromDetails: async (
    input: Infer<typeof createTemplateDetailsSchema>,
  ) => {
    const normalizeTime = (value: string) =>
      value.length === 5 ? `${value}:00` : value;

    const name = `${input.eventName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')}-${crypto.randomUUID().slice(0, 8)}`;

    const [row] = await db
      .insert(templates)
      .values({
        name,
        display: input.eventName.trim(),
        description: input.description,
        location: input.location,
        timeBegin: normalizeTime(input.timeBegin),
        timeEnd: input.timeEnd ? normalizeTime(input.timeEnd) : null,
      })
      .returning({ id: templates.id });

    return row;
  },
  templatePositionsByTemplateId: async (input: { templateId: string }) => {
    const { templateId } = input;
    const rows = await db
      .select({
        id: templatePositions.id,
        quantity: templatePositions.quantity,
        positionId: positions.id,
        positionName: positions.name,
        positionDisplay: positions.display,
        positionDescription: positions.description,
      })
      .from(templatePositions)
      .innerJoin(positions, eq(templatePositions.positionId, positions.id))
      .where(eq(templatePositions.templateId, templateId));

    return rows.map((row) => ({
      id: row.id,
      quantity: row.quantity,
      position: {
        id: row.positionId,
        name: row.positionName,
        display: row.positionDisplay,
        description: row.positionDescription,
      },
    }));
  },
  createTemplatePositions: async (
    input: Infer<typeof createTemplatePositionsSchema>,
  ) => {
    const { templateId, templatePositionsToCreate } = input;
    const existing = await db
      .select({ positionId: templatePositions.positionId })
      .from(templatePositions)
      .where(eq(templatePositions.templateId, templateId));

    const existingPositionIds = new Set(existing.map((row) => row.positionId));
    const rowsToInsert = templatePositionsToCreate.filter(
      (row) => !existingPositionIds.has(row.positionId),
    );

    if (rowsToInsert.length === 0) return [];

    return await db
      .insert(templatePositions)
      .values(
        rowsToInsert.map((row) => ({
          templateId,
          positionId: row.positionId,
          quantity: row.quantity,
        })),
      )
      .returning({ id: templatePositions.id });
  },
  deleteTemplatePosition: async (input: { templatePositionId: string }) => {
    const { templatePositionId } = input;
    const [row] = await db
      .delete(templatePositions)
      .where(eq(templatePositions.id, templatePositionId))
      .returning({ id: templatePositions.id });

    return row;
  },
  updateDetails: async (input: Infer<typeof updateTemplateDetailsSchema>) => {
    const { templateId, name, eventName, timeBegin, timeEnd, ...rest } = input;
    const normalizeTime = (value: string) =>
      value.length === 5 ? `${value}:00` : value;

    const [row] = await db
      .update(templates)
      .set({
        ...rest,
        ...(name ? { name: name.trim() } : {}),
        ...(eventName ? { display: eventName.trim() } : {}),
        ...(timeBegin ? { timeBegin: normalizeTime(timeBegin) } : {}),
        ...(timeEnd !== undefined
          ? { timeEnd: timeEnd ? normalizeTime(timeEnd) : null }
          : {}),
      })
      .where(eq(templates.id, templateId))
      .returning({ id: templates.id });

    return row;
  },
  updatePositionQuantity: async (
    input: Infer<typeof updateTemplatePositionQuantitySchema>,
  ) => {
    const { templatePositionId, quantity } = input;
    const [row] = await db
      .update(templatePositions)
      .set({ quantity })
      .where(eq(templatePositions.id, templatePositionId))
      .returning({ id: templatePositions.id });

    return row;
  },
  createEventFromTemplate: async (
    input: Infer<typeof createEventFromTemplateSchema>,
  ) => {
    const { templateId, date, createdBy } = input;
    const templateRows = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId));

    if (templateRows.length === 0) throw new Error('Template not found.');
    const [template] = templateRows;

    const [eventRow] = await db
      .insert(events)
      .values({
        name: template.display,
        description: template.description,
        location: template.location,
        timeBegin: dayjs(`${date} ${template.timeBegin}`).toISOString(),
        timeEnd: template.timeEnd
          ? dayjs(`${date} ${template.timeEnd}`).toISOString()
          : null,
        createdBy,
      })
      .returning({ id: events.id });

    const templatePositionRows = await db
      .select({
        positionId: templatePositions.positionId,
        quantity: templatePositions.quantity,
      })
      .from(templatePositions)
      .where(eq(templatePositions.templateId, templateId));

    if (templatePositionRows.length > 0) {
      await db.insert(shifts).values(
        templatePositionRows.map((row) => ({
          eventId: eventRow.id,
          positionId: row.positionId,
          quantity: row.quantity,
        })),
      );
    }

    return eventRow;
  },
};
