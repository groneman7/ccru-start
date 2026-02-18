import { createFileRoute, Outlet } from '@tanstack/react-router';
import { cn } from '~/lib/utils';
import dayjs from 'dayjs';

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
});

function RouteComponent() {
  const time = dayjs().hour();
  const isNight = time >= 19 || time <= 7;

  return (
    <div
      className={cn(
        'flex h-screen flex-1 items-center justify-center bg-cover bg-center bg-no-repeat bg-origin-border',
        isNight
          ? 'bg-[url("/camping_vector_night.svg")]'
          : 'bg-[url("/camping_vector.svg")]',
      )}
    >
      <div className="flex h-full w-lg flex-col bg-white/75 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-1 items-center justify-center p-8">
          <Outlet />
        </div>
        <div className="flex w-full justify-center py-4">
          <p className="text-center text-xs text-gray-500">
            Powered by{' '}
            <a
              href="https://better-auth.com"
              className="underline"
              target="_blank"
            >
              better-auth
            </a>
            .
          </p>
        </div>
      </div>
      {/* <Outlet /> */}
    </div>
  );
}
