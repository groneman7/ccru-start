import { IconClipboardPlusFilled } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/admin/certifications/')({
  component: CertificationsIndex,
});

function CertificationsIndex() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <IconClipboardPlusFilled className="size-24 text-gray-300" />
      <span className="text-xl text-gray-400 select-none">
        Select a certification to edit or create a new one.
      </span>
    </div>
  );
}
