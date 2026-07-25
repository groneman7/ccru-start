import { createFileRoute, Link } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';

export const Route = createFileRoute('/_authed/dev-tools/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <WorkspaceHeader>Developer Tools</WorkspaceHeader>
      <WorkspaceContent>
        <div className="flex flex-col gap-1">
          <Link to="/dev-tools/ui">UI</Link>
        </div>
      </WorkspaceContent>
    </>
  );
}
