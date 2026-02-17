import { queryOptions } from '@tanstack/react-query';
import { getEventsByMonth } from '~/server/routes/calendar.server';

export function eventsByMonthQuery(month: number, year: number) {
  return queryOptions({
    queryKey: ['eventsByMonth', month, year],
    queryFn: () => getEventsByMonth({ data: { month, year } }),
  });
}
