import { queryOptions } from '@tanstack/react-query';
import { registrationServerFns } from '~/features/registration/functions';

export function registrationModeQuery() {
  return queryOptions({
    queryKey: ['registration-mode'],
    queryFn: () => registrationServerFns.getMode(),
  });
}
