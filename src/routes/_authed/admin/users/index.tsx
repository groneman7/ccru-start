import { IconEye } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui';
import {
  allSystemRolesQuery,
  allUserTypesQuery,
} from '~/features/authz/queries';
import type { userTypeSchema } from '~/features/authz/schema';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import {
  updateSystemRoleMutation,
  updateUserTypeMutation,
} from '~/features/users/mutations';
import { allUsersQuery } from '~/features/users/queries';
import { authSessionQueryKey } from '~/features/auth/queries';
import { authClient } from '~/lib/auth-client';
import { getUserPermissions } from '~/server/permissions';
import { ListFilterIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { infer as Infer } from 'zod';

export const Route = createFileRoute('/_authed/admin/users/')({
  component: RouteComponent,
});

function RouteComponent() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = Route.useRouteContext();
  const permissions = getUserPermissions(currentUser);

  const [filters, setFilters] = useState({
    role: null as string | null,
    userTypeId: null as string | null,
    search: '',
  });
  const [pendingUserTypeIds, setPendingUserTypeIds] = useState<
    Record<string, string | null>
  >({});

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery(allUsersQuery());
  const { data: systemRoles } = useQuery(allSystemRolesQuery());
  const { data: userTypes } = useQuery(allUserTypesQuery());

  // Mutations
  const { mutate: updateSystemRole } = useMutation({
    ...updateSystemRoleMutation(),
  });

  const { mutate: updateUserType } = useMutation({
    ...updateUserTypeMutation(),
  });

  const userTypeOptions = [
    { id: 'any', display: 'Any' },
    ...(userTypes ?? []).map((userType) => ({
      id: userType.id,
      display: userType.display,
    })),
  ];

  const selectedUserTypeOption =
    userTypeOptions.find((option) => option.id === filters.userTypeId) ??
    userTypeOptions[0];
  const filteredUsers = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    if (!users) return [];
    return users.filter((user) => {
      if (filters.role && user.role !== filters.role) {
        return false;
      }
      if (filters.userTypeId && user.userTypeId !== filters.userTypeId) {
        return false;
      }
      if (!search) return true;
      return [user.display, user.email, user.nameFirst, user.nameLast]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
    });
  }, [filters.search, filters.role, filters.userTypeId, users]);
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) =>
      a.nameLast!.localeCompare(b.nameLast!),
    );
  }, [filteredUsers]);
  const hasActiveFilters =
    filters.role !== null ||
    filters.userTypeId !== null ||
    filters.search.trim().length > 0;

  if (usersLoading) return <div>Loading users...</div>;

  if (!users) return null;
  return (
    <>
      <WorkspaceHeader>Users</WorkspaceHeader>
      <WorkspaceContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline">
                  <ListFilterIcon />
                  Filters
                </Button>
              }
            />
            <PopoverContent align="start" className="w-80">
              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  System Role
                </div>
                <Combobox
                  items={SYSTEM_ROLES}
                  value={filters.role}
                  onValueChange={(value) => {
                    if (!value) {
                      setFilters((prev) => ({
                        ...prev,
                        role: null,
                      }));
                      return;
                    }
                    setFilters((prev) => ({
                      ...prev,
                      role: value,
                    }));
                  }}
                >
                  <ComboboxTrigger
                    render={
                      <Button
                        className="w-full justify-start text-left font-normal"
                        variant="outline"
                      >
                        <ComboboxValue />
                      </Button>
                    }
                  />
                  <ComboboxContent>
                    <ComboboxInput
                      className="mb-1! h-7! text-sm"
                      placeholder="Filter system roles..."
                      showTrigger={false}
                    />
                    <ComboboxEmpty>No system roles found.</ComboboxEmpty>
                    <ComboboxList>
                      {(option) => (
                        <ComboboxItem key={option.id} value={option}>
                          {option.display}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  User Type
                </div>
                <Combobox
                  items={userTypeOptions}
                  value={selectedUserTypeOption}
                  itemToStringLabel={(option) => option.display}
                  itemToStringValue={(option) => option.id}
                  onValueChange={(value) => {
                    if (!value || value.id === 'any') {
                      setFilters((prev) => ({
                        ...prev,
                        userTypeId: null,
                      }));
                      return;
                    }
                    setFilters((prev) => ({
                      ...prev,
                      userTypeId: value.id,
                    }));
                  }}
                >
                  <ComboboxTrigger
                    render={
                      <Button
                        className="w-full justify-start text-left font-normal"
                        variant="outline"
                      >
                        <ComboboxValue />
                      </Button>
                    }
                  />
                  <ComboboxContent>
                    <ComboboxInput
                      className="mb-1! h-7! text-sm"
                      placeholder="Filter user types..."
                      showTrigger={false}
                    />
                    <ComboboxEmpty>No user types found.</ComboboxEmpty>
                    <ComboboxList>
                      {(option) => (
                        <ComboboxItem key={option.id} value={option}>
                          {option.display}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    disabled={!hasActiveFilters}
                    onClick={() =>
                      setFilters({
                        role: null,
                        userTypeId: null,
                        search: '',
                      })
                    }
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex justify-end gap-2">
            <Input
              placeholder="Search"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {sortedUsers.map((user) => {
            const selectedUserTypeId =
              pendingUserTypeIds[user.id] ?? user.userTypeId ?? null;
            const selectedUserType =
              userTypes?.find(
                (userType) => userType.id === selectedUserTypeId,
              ) ?? null;

            return (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-sm p-2 shadow-sm"
              >
                <div className="flex w-1/5 flex-col gap-1">
                  <div>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: user.id }}
                    >
                      {user.display}
                    </Link>
                  </div>
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="w-1/6 text-sm">
                  <Combobox
                    value={user.role}
                    items={systemRoles ?? []}
                    onValueChange={(value) => {
                      if (!value) return;
                      updateSystemRole(
                        {
                          userId: user.id,
                          role: value,
                        },
                        {
                          onSuccess: () => {
                            const fullName = [user.nameFirst, user.nameLast]
                              .filter(Boolean)
                              .join(' ');
                            toast.success(
                              `System Role updated to ${value} for ${fullName}`,
                            );
                            // TODO: UI update for role change
                          },
                        },
                      );
                    }}
                  >
                    <ComboboxTrigger
                      render={
                        <Button
                          className="w-full justify-start text-left font-normal"
                          variant="ghost"
                        >
                          <ComboboxValue />
                        </Button>
                      }
                    />
                    <ComboboxContent>
                      <ComboboxInput
                        className="mb-1! h-7! text-sm"
                        placeholder="Search"
                        showTrigger={false}
                      />
                      <ComboboxEmpty>No system roles defined.</ComboboxEmpty>
                      <ComboboxList>
                        {(role: string) => (
                          <ComboboxItem key={role} value={role}>
                            {role}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <div className="w-1/5 text-sm">
                  <Combobox
                    items={
                      userTypes
                        ?.slice()
                        .sort((a, b) => a.name.localeCompare(b.name)) ?? []
                    }
                    itemToStringLabel={(
                      userType: Infer<typeof userTypeSchema>,
                    ) => userType.display}
                    itemToStringValue={(
                      userType: Infer<typeof userTypeSchema>,
                    ) => userType.id}
                    value={selectedUserType}
                    onValueChange={(value) => {
                      if (!value) return;
                      setPendingUserTypeIds((prev) => ({
                        ...prev,
                        [user.id]: value.id,
                      }));
                      updateUserType(
                        {
                          userId: user.id,
                          userTypeId: value.id,
                        },
                        {
                          onError: () => {
                            setPendingUserTypeIds((prev) => ({
                              ...prev,
                              [user.id]: user.userTypeId ?? null,
                            }));
                          },
                          onSuccess: () => {
                            const fullName = [user.nameFirst, user.nameLast]
                              .filter(Boolean)
                              .join(' ');
                            toast.success(
                              `User type updated to ${value.display} for ${fullName}`,
                            );
                          },
                        },
                      );
                    }}
                  >
                    <ComboboxTrigger
                      render={
                        <Button
                          className="w-full justify-start text-left font-normal"
                          variant="ghost"
                        >
                          <ComboboxValue />
                        </Button>
                      }
                    />
                    <ComboboxContent>
                      <ComboboxInput
                        className="mb-1! h-7! text-sm"
                        placeholder="Search"
                        showTrigger={false}
                      />
                      <ComboboxEmpty>No system roles defined.</ComboboxEmpty>
                      <ComboboxList>
                        {(userType: Infer<typeof userTypeSchema>) => (
                          <ComboboxItem key={userType.id} value={userType}>
                            {userType.display}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <div className="flex flex-1 items-center justify-end">
                  {permissions.can('impersonate', 'System') &&
                    user.id !== currentUser.id && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div>
                              <Button
                                size="icon"
                                onClick={async () => {
                                  if (currentUser.impersonatedBy) {
                                    // 1. Stop impersonating
                                    await authClient.admin.stopImpersonating();
                                    queryClient.removeQueries({
                                      queryKey: authSessionQueryKey,
                                    });
                                  }
                                  const response =
                                    await authClient.admin.impersonateUser({
                                      userId: user.id,
                                    });
                                  if (response.error) return;
                                  queryClient.removeQueries({
                                    queryKey: authSessionQueryKey,
                                  });
                                  nav({ reloadDocument: true });
                                }}
                              >
                                <IconEye />
                              </Button>
                            </div>
                          }
                        />
                        <TooltipContent sideOffset={8}>
                          {currentUser.impersonatedBy
                            ? 'Already impersonating a user. This will stop current impersonation.'
                            : 'Impersonate user'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </WorkspaceContent>
    </>
  );
}
