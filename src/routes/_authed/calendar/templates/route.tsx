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
import { allTemplatesQuery } from '~/features/calendar/calendar.queries';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/calendar/templates')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(allTemplatesQuery());
  },
  component: TemplatesRouteLayout,
  head: () => ({
    meta: [{ title: 'CCRU | Event Templates' }],
  }),
});

function TemplatesRouteLayout() {
  const selectedId = useParams({
    from: '/_authed/calendar/templates/$templateId',
    shouldThrow: false,
  })?.templateId;

  const { data: templates, isLoading: templatesIsLoading } =
    useQuery(allTemplatesQuery());

  if (templatesIsLoading) return 'loading templates';
  if (!templates) return null;

  return (
    <>
      <WorkspaceHeader>Event Templates</WorkspaceHeader>
      <WorkspaceContent orientation="horizontal">
        <div className="flex w-xs flex-col overflow-clip rounded border">
          <Link className="flex" to="/calendar/templates/new">
            <Button className="m-1 flex-1" variant="ghost">
              <IconPlus />
              Add template
            </Button>
          </Link>
          {templates
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((template) => (
              <Link
                key={template.id}
                className={cn(
                  'px-2 py-1',
                  template.id === selectedId &&
                    'bg-accent font-semibold text-accent-foreground',
                )}
                to="/calendar/templates/$templateId"
                params={{ templateId: template.id }}
              >
                {template.name}
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
