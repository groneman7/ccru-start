import { createFileRoute, Link } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';

export const Route = createFileRoute('/_authed/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <WorkspaceHeader>Admin</WorkspaceHeader>
      <WorkspaceContent>
        <div className="flex flex-col gap-1">
          <Link to="/admin/users">Users</Link>
          {/* <Link to="/admin/positions">Positions</Link> */}
          {/* <Link to="/admin/matrix">Matrix</Link> */}
        </div>
      </WorkspaceContent>
    </>
  );
}
