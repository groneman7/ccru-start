import { queryOptions } from '@tanstack/react-query';
import { userServerFns as user } from '~/features/admin/users.functions';

export function allUsersQuery() {
  return queryOptions({
    queryKey: ['allUsers'],
    queryFn: () => user.all(),
  });
}

export function allUsersForComboboxQuery() {
  return queryOptions({
    queryKey: ['allUsersForCombobox'],
    queryFn: () => user.allForCombobox(),
  });
}
