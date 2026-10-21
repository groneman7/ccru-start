import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  formatEventDate,
  formatEventTime,
} from '~/features/calendar/event-time';
import { publicEventsQuery } from '~/features/calendar/public-queries';
import { useEventExpiry } from '~/features/calendar/use-event-expiry';

export const Route = createFileRoute('/events/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.fetchQuery(publicEventsQuery()),
  component: PublicEventsPage,
});
function PublicEventsPage() {
  const { data: events = [], error } = useQuery(publicEventsQuery());
  const now = useEventExpiry(events.map((event) => event.timeEnd));
  const visible = events.filter((event) => Date.parse(event.timeEnd) > now);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Upcoming and current events</h1>
      {error && <p role="alert">Unable to load events. Please refresh.</p>}
      {!visible.length && !error && <p>No upcoming or current events.</p>}
      {visible.map((event) => (
        <article key={event.id} className="rounded border p-4">
          <Link
            className="text-xl underline"
            to="/events/$eventId"
            params={{ eventId: event.id }}
          >
            {event.name}
          </Link>
          <p>{formatEventDate(event.timeBegin)}</p>
          <p>
            {formatEventTime(event.timeBegin)} –{' '}
            {formatEventTime(event.timeEnd)}
          </p>
          {event.location && <p>{event.location.name}</p>}
          {event.description && <p>{event.description}</p>}
        </article>
      ))}
    </section>
  );
}
