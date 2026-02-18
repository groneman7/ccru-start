import { IconCalendarPlus } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/calendar/templates/')({
  component: TemplatesIndex,
});

function TemplatesIndex() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <IconCalendarPlus className="size-24 text-gray-300" />
      <span className="text-xl text-gray-400 select-none">
        Select a template to edit or create a new one.
      </span>
    </div>
  );
}
