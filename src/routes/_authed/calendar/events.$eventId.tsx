import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { getEventDetails } from '~/features/calendar/calendar.queries';

export const Route = createFileRoute('/_authed/calendar/events/$eventId')({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: 'CCRU | Event' }],
  }),
  loader: async ({ context: { queryClient }, params: { eventId } }) => {
    await queryClient.ensureQueryData(getEventDetails(eventId));
  },
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  const { data } = useQuery(getEventDetails(eventId));
  console.log(data);

  return <div>Event</div>;
}
