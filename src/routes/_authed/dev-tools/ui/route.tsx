import { createFileRoute, Link } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';

export const Route = createFileRoute('/_authed/dev-tools/ui')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <WorkspaceHeader>Developer Tools / UI</WorkspaceHeader>
      <WorkspaceContent>Welcome to UI tools</WorkspaceContent>
    </>
  );
}
