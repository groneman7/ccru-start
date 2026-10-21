import { queryOptions } from '@tanstack/react-query';
import { publicEventServerFns } from './functions';

export function publicEventsQuery() {
  return queryOptions({
    queryKey: ['public-events'],
    queryFn: () => publicEventServerFns.list(),
    staleTime: 0,
    gcTime: 30000,
    refetchOnMount: 'always',
  });
}
export function publicEventQuery(eventId: string) {
  return queryOptions({
    queryKey: ['public-event', eventId],
    queryFn: () => publicEventServerFns.byId({ data: { eventId } }),
    staleTime: 0,
    gcTime: 30000,
    refetchOnMount: 'always',
  });
}
