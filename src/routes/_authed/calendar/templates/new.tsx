import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/calendar/templates/new')({
  component: NewTemplatePage,
});

function NewTemplatePage() {
  return <div>Hello "/_authed/calendar/templates/new"!</div>;
}
