import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { getContext } from './lib/tanstack-query/root-provider';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,

    context: getContext(),
    defaultPendingComponent: () => (
      <div className={`p-2 text-2xl`}>Pending component...</div>
    ),
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
