import { queryOptions } from '@tanstack/react-query';
import { getSessionServerFn } from '~/features/auth/functions';

export const authSessionQueryKey = ['auth', 'session'] as const;

export function authSessionQuery() {
  return queryOptions({
    queryKey: authSessionQueryKey,
    queryFn: () => getSessionServerFn(),
    staleTime: 60 * 1000,
  });
}
