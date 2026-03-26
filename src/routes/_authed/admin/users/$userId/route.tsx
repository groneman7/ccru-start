import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/admin/users/$userId')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authed/admin/users/$userId"!</div>;
}
