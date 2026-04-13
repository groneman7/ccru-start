import { IconClipboardPlusFilled } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/admin/positions/')({
  component: PositionsIndex,
});

function PositionsIndex() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <IconClipboardPlusFilled className="size-24 text-gray-300" />
      <span className="text-xl text-gray-400 select-none">
        Select a position to edit or create a new one.
      </span>
    </div>
  );
}
