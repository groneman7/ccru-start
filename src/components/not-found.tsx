import { IconFileUnknownFilled } from '@tabler/icons-react';

export function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="flex w-lg flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center justify-center gap-4">
          <IconFileUnknownFilled className="size-48 text-slate-900/70" />
          <span className="text-6xl font-bold text-shadow-lg">404</span>
        </div>
        <span className="text-2xl">
          The page you are trying to access does not exist.
        </span>
      </div>
    </div>
  );
}
