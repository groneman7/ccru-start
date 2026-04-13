import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { Button } from '~/components/ui';
import { allPositionsQuery } from '~/features/calendar/queries';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/admin/positions')({
  component: PositionsRouteLayout,
});

function PositionsRouteLayout() {
  const selectedId = useParams({
    from: '/_authed/admin/positions/$positionId',
    shouldThrow: false,
  })?.positionId;

  // Queries
  const { data: allPositions } = useQuery(allPositionsQuery());

  return (
    <>
      <WorkspaceHeader>Positions</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <div className="flex w-xs flex-col overflow-clip rounded border">
          <Link className="flex" to="/admin/positions/new">
            <Button className="m-1 flex-1" variant="ghost">
              <IconPlus />
              Add position
            </Button>
          </Link>
          {allPositions
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((position) => (
              <Link
                key={position.id}
                className={cn(
                  'px-2 py-1',
                  position.id === selectedId &&
                    'bg-accent font-semibold text-accent-foreground',
                )}
                to="/admin/positions/$positionId"
                params={{ positionId: position.id }}
              >
                {position.name}
              </Link>
            ))}
        </div>
        <div className="flex flex-2 flex-col">
          <Outlet />
        </div>
      </WorkspaceContent>
    </>
  );
}
