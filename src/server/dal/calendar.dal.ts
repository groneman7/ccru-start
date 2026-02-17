import { db } from '~/server/db';
import { eventsInCalendar as events } from '~/server/db/schema';
import { and, gte, lt } from 'drizzle-orm';

export function getEventsByMonthDAL(month: number, year: number) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  return db.query.eventsInCalendar.findMany({
    where: and(gte(events.timeBegin, start), lt(events.timeBegin, end)),
  });
}
