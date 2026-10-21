import type {
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  createTemplatePositionsSchema,
  createTemplateSchema,
  templateSchemaWithPositions,
  updateEventSchema,
  updatePositionDetailsSchema,
  updateTemplateSchema,
} from '~/features/calendar/schema';
import { throwPositionError } from '~/features/eligibility/errors';
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
import { and, count, eq, gt, gte, isNull, lt } from 'drizzle-orm';
import type { infer as Infer } from 'zod';
import { throwEventError } from './event-errors';
import {
  eventLocalToInstant,
  eventPhase,
  validEventWindow,
} from './event-time';

// Events ---------------------------------------------------------------------

export const eventRepository = {
  byId: async (input: { eventId: string }) => {
    const { eventId } = input;
    const [row] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)));
    if (!row) throw new Error('Event not found');
    return { ...row, phase: eventPhase(row.timeBegin, row.timeEnd) };
  },
  byMonth: async (input: { month: number; year: number }) => {
    const { month, year } = input;

    const start = eventLocalToInstant(
      `${year}-${String(month).padStart(2, '0')}-01`,
      '00:00',
    );
    const next = new Date(Date.UTC(year, month, 1));
    const end = eventLocalToInstant(next.toISOString().slice(0, 10), '00:00');

    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          gte(events.timeBegin, start),
          lt(events.timeBegin, end),
          isNull(events.deletedAt),
        ),
      );

    return rows;
  },
  create: async (input: Infer<typeof createEventSchema>) => {
    const [row] = await db
      .insert(events)
      .values(input)
      .returning({ id: events.id })
      .catch(throwEventError);
    if (!row) throw new Error('Event not found');

    return row;
  },
  createFromTemplate: async (input: {
    templateId: string;
    date: string;
    createdBy: string;
  }) => {
    const { templateId, date, createdBy } = input;

    const [templateRow] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId));

    if (!templateRow?.timeEnd || templateRow.timeEnd <= templateRow.timeBegin)
      throw new Error(
        'Template needs valid start and end times before creating an event',
      );
    const timeBegin = eventLocalToInstant(date, templateRow.timeBegin);
    const timeEnd = eventLocalToInstant(date, templateRow.timeEnd);
    if (!validEventWindow(timeBegin, timeEnd))
      throw new Error(
        'Event end must be later than start on the same America/New_York date',
      );
    const [newEvent] = await db
      .insert(events)
      .values({
        name: templateRow.display,
        description: templateRow.description,
        location: templateRow.location,
        timeBegin,
        timeEnd,
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
          eventId: newEvent.id,
          positionId: row.positionId,
          quantity: row.quantity,
        })),
      );
    }

    return newEvent;
  },
  update: async (input: Infer<typeof updateEventSchema>) => {
    const { eventId, data } = input;
    const [row] = await db
      .update(events)
      .set(data)
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
      .returning({ id: events.id })
      .catch(throwEventError);
    if (!row) throw new Error('Event not found');

    return row;
  },
};

// Positions ------------------------------------------------------------------

export const positionRepository = {
  all: async () => {
    const rows = await db
      .select()
      .from(positions)
      .where(isNull(positions.deletedAt));

    return rows;
  },
  byId: async (input: { positionId: string }) => {
    const { positionId } = input;
    const [row] = await db
      .select()
      .from(positions)
      .where(and(eq(positions.id, positionId), isNull(positions.deletedAt)));

    if (!row) throw new Error('Position not found');
    return row;
  },
  create: async (input: Infer<typeof createPositionSchema>) => {
    const [row] = await db
      .insert(positions)
      .values(input)
      .returning({ id: positions.id })
      .catch(throwPositionError);

    if (!row) throw new Error('Position not found');
    return row;
  },
  update: async (input: Infer<typeof updatePositionDetailsSchema>) => {
    const { positionId, data } = input;
    const [row] = await db
      .update(positions)
      .set(data)
      .where(and(eq(positions.id, positionId), isNull(positions.deletedAt)))
      .returning({ id: positions.id })
      .catch(throwPositionError);

    if (!row) throw new Error('Position not found');
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
        userDisplay: users.display,
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
      .returning({ id: slots.id, assignedAt: slots.assignedAt });

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
      .returning({ id: slots.id, assignedAt: slots.assignedAt });

    return row;
  },
};

// Templates ------------------------------------------------------------------

export const templateRepository = {
  all: async () => {
    const rows = await db.select().from(templates);

    return rows;
  },
  byId: async (input: {
    templateId: string;
  }): Promise<Infer<typeof templateSchemaWithPositions>> => {
    // Returns a template with its assocaited positions.
    const { templateId } = input;
    const [templateRow] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId));

    const templatePositionRows = await db
      .select({
        junctionId: templatePositions.id,
        quantity: templatePositions.quantity,
        id: positions.id,
        name: positions.name,
        display: positions.display,
        description: positions.description,
      })
      .from(templatePositions)
      .innerJoin(positions, eq(templatePositions.positionId, positions.id))
      .where(eq(templatePositions.templateId, templateId));

    const joined = { ...templateRow, positions: templatePositionRows };
    return joined;
  },
  create: async (input: Infer<typeof createTemplateSchema>) => {
    const [row] = await db
      .insert(templates)
      .values(input)
      .returning({ id: templates.id });

    return row;
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
  updateDetails: async (input: Infer<typeof updateTemplateSchema>) => {
    const { templateId, data } = input;

    const [row] = await db
      .update(templates)
      .set(data)
      .where(eq(templates.id, templateId))
      .returning({ id: templates.id });

    return row;
  },
  updatePositionQuantity: async (input: {
    templatePositionId: string;
    quantity: number;
  }) => {
    const { templatePositionId, quantity } = input;
    const [row] = await db
      .update(templatePositions)
      .set({ quantity })
      .where(eq(templatePositions.id, templatePositionId))
      .returning({ id: templatePositions.id });

    return row;
  },
};

// Public readers select an explicit audience projection before crossing RPC.
const publicEventProjection = {
  id: events.id,
  name: events.name,
  description: events.description,
  location: events.location,
  timeBegin: events.timeBegin,
  timeEnd: events.timeEnd,
};
function publicLocation(row: typeof events.$inferSelect.location) {
  if (!row) return null;
  return {
    name: typeof row.name === 'string' ? row.name : '',
    line1: typeof row.line1 === 'string' ? row.line1 : '',
    line2: typeof row.line2 === 'string' ? row.line2 : null,
    city: typeof row.city === 'string' ? row.city : '',
    state: typeof row.state === 'string' ? row.state : '',
    zip: typeof row.zip === 'string' ? row.zip : '',
  };
}
export async function readPublicEvents(eventId?: string) {
  const rows = await db
    .select(publicEventProjection)
    .from(events)
    .where(
      and(
        isNull(events.cancelledAt),
        isNull(events.deletedAt),
        gt(events.timeEnd, new Date().toISOString()),
        eventId ? eq(events.id, eventId) : undefined,
      ),
    )
    .orderBy(events.timeBegin, events.id);
  return rows.map((row) => ({
    ...row,
    location: publicLocation(row.location),
  }));
}
