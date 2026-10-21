import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { PublicEventDetails } from '~/features/calendar/public-details';
import { publicEventQuery } from '~/features/calendar/public-queries';
import { useEventExpiry } from '~/features/calendar/use-event-expiry';
import { uuidv7 } from 'zod';

export const Route = createFileRoute('/events/$eventId')({
  loader: async ({ context: { queryClient }, params: { eventId } }) => {
    if (!uuidv7().safeParse(eventId).success) throw notFound();
    const event = await queryClient.fetchQuery(publicEventQuery(eventId));
    if (!event) throw notFound();
    return event;
  },
  notFoundComponent: () => <p>This event is not available.</p>,
  component: PublicEventPage,
});
function PublicEventPage() {
  const { eventId } = Route.useParams();
  const { data: event, error } = useQuery(publicEventQuery(eventId));
  const now = useEventExpiry(event ? [event.timeEnd] : []);
  if (error)
    return <p role="alert">Unable to load this event. Please refresh.</p>;
  if (!event || Date.parse(event.timeEnd) <= now)
    return <p>This event is not available.</p>;
  return <PublicEventDetails event={event} />;
}
