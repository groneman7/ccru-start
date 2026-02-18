import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceContent } from '~/components';
import { Calendar } from '~/components/calendar';
import { getEventsByMonthQuery } from '~/features/calendar/calendar.queries';
import dayjs from 'dayjs';

export const Route = createFileRoute('/_authed/calendar/$year/$month')({
  component: CalendarPage,
  head: () => ({
    meta: [{ title: 'CCRU | Calendar' }],
  }),
  loader: async ({ context: { queryClient }, params: { month, year } }) => {
    await queryClient.ensureQueryData(
      getEventsByMonthQuery(Number(month), Number(year)),
    );
  },
});

function CalendarPage() {
  const { month, year } = Route.useParams();
  const { data: events } = useQuery(
    getEventsByMonthQuery(Number(month), Number(year)),
  );

  return (
    <WorkspaceContent className="p-0">
      <Calendar events={events} month={dayjs(`${year}-${month}`)} />
    </WorkspaceContent>
  );
}
