import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/events')({
  headers: () => ({ 'Cache-Control': 'no-store' }),
  component: () => (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <Link to="/events" className="text-xl font-semibold">
          CCRU events
        </Link>
        <Link to="/sign-in" className="underline">
          Sign in
        </Link>
      </header>
      <p>Event times are shown in America/New_York.</p>
      <Outlet />
    </main>
  ),
});
