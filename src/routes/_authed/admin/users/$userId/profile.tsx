import { createFileRoute } from '@tanstack/react-router';

// TODO: Only the current user and non-impersonated users can make changes to a profile.

export const Route = createFileRoute('/_authed/admin/users/$userId/profile')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authed/admin/users/$userId/profile"!</div>;
}
