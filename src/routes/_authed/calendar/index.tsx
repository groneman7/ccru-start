import { createFileRoute, redirect } from '@tanstack/react-router';
import dayjs from 'dayjs';

export const Route = createFileRoute('/_authed/calendar/')({
  beforeLoad: () => {
    const now = dayjs();
    const year = now.year().toString();
    const month = (now.month() + 1).toString();

    throw redirect({
      to: '/calendar/$year/$month',
      params: {
        year,
        month,
      },
      replace: true,
    });
  },
  component: () => null,
  head: () => ({
    meta: [{ title: 'CCRU | Calendar' }],
  }),
});
