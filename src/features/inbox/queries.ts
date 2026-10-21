import { queryOptions } from '@tanstack/react-query';
import { inboxServerFns } from '~/features/inbox/functions';

export function inboxQuery(history = false) {
  return queryOptions({
    queryKey: ['inbox', history],
    queryFn: () => inboxServerFns.list({ data: { history } }),
    refetchInterval: 15000,
  });
}
