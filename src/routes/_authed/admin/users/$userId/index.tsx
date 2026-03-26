import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/admin/users/$userId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/admin/users/$userId/profile',
      params: { userId: params.userId },
    });
  },
});
