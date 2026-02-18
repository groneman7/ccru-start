import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { Button } from '~/components/ui';
import { allTemplatesQuery } from '~/features/calendar/calendar.queries';

export const Route = createFileRoute('/_authed/calendar/templates')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(allTemplatesQuery());
    return;
  },
  component: RouteComponent,
  head: () => ({
    meta: [{ title: 'CCRU | Event Templates' }],
  }),
});

function RouteComponent() {
  const { data: templates, isLoading: templatesIsLoading } =
    useQuery(allTemplatesQuery());

  if (templatesIsLoading) return 'loading templates';
  if (!templates) return null;

  return (
    <>
      <WorkspaceHeader>Event Templates</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <div className="flex w-xs flex-col overflow-clip rounded border">
          <Button className="m-1" disabled variant="ghost">
            <IconPlus />
            Add template
          </Button>
          {[...templates]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((template) => (
              <div key={template.id} className="px-2 py-1">
                {template.name}
              </div>
            ))}
        </div>
        <div className="flex flex-2 flex-col">
          <Outlet />
        </div>
      </WorkspaceContent>
    </>
  );
}
