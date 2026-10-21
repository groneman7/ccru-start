import { queryOptions } from '@tanstack/react-query';
import { positionServerFns } from '~/features/calendar/functions';

export function positionEligibilityQuery(positionId: string, userId: string) {
  return queryOptions({
    queryKey: ['positionEligibility', positionId, userId],
    queryFn: () =>
      positionServerFns.eligibility({ data: { positionId, userId } }),
  });
}
