import { IconEye, IconFilter2, IconUserCancel } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import {
  Badge,
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
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui';
import { authSessionQueryKey } from '~/features/auth/queries';
import { allUserTypesQuery } from '~/features/authz/queries';
import type { userTypeSchema } from '~/features/authz/schema';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import {
  updateCapabilitiesMutation,
  updateSystemRoleMutation,
  updateUserStatusMutation,
  updateUserTypeMutation,
} from '~/features/users/mutations';
import { OfficerCapabilities } from '~/features/users/officer-capabilities';
import { allUsersQuery, userByIdQuery } from '~/features/users/queries';
import { SystemRoleSelect } from '~/features/users/system-role-select';
import { authClient } from '~/lib/auth-client';
import { getUserPermissions } from '~/server/permissions';
import { hasAuthority } from '~/server/permissions/policy';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { infer as Infer } from 'zod';

export const Route = createFileRoute('/_authed/admin/users/')({
  component: RouteComponent,
});

function RouteComponent() {
  const nav = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = Route.useRouteContext();
  const permissions = getUserPermissions(currentUser);
  const { mutate: updateCapabilities, isPending: capabilitiesPending } =
    useMutation({
      ...updateCapabilitiesMutation(),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: allUsersQuery().queryKey }),
    });

  const [filters, setFilters] = useState({
    role: null as string | null,
    userTypeId: null as string | null,
    search: '',
  });
  const [pendingUserTypeIds, setPendingUserTypeIds] = useState<
    Record<string, string | null>
  >({});
  const [pendingStatuses, setPendingStatuses] = useState<
    Record<string, 'active' | 'inactive'>
  >({});

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery(allUsersQuery());
  const { data: userTypes } = useQuery(allUserTypesQuery());

  // Mutations
  const { mutate: updateSystemRole } = useMutation({
    ...updateSystemRoleMutation(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: allUsersQuery().queryKey }),
        queryClient.invalidateQueries({ queryKey: authSessionQueryKey }),
      ]);
      await router.invalidate();
    },
  });

  const { mutate: updateUserStatus } = useMutation({
    ...updateUserStatusMutation(),
  });

  const { mutate: updateUserType } = useMutation({
    ...updateUserTypeMutation(),
  });

  const formatStatusLabel = (status: string) =>
    status.slice(0, 1).toUpperCase() + status.slice(1);

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
                  <IconFilter2 />
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
            const resolvedStatus = pendingStatuses[user.id] ?? user.status;
            const isToggleableStatus = user.status !== 'invited';
            const isActive = resolvedStatus === 'active';

            return (
              <div
                data-user-active={isActive}
                key={user.id}
                className="flex items-center gap-4 rounded-sm p-2 shadow-sm data-[user-active=false]:bg-gray-50/80 data-[user-active=false]:text-gray-500"
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
                  <SystemRoleSelect
                    actor={currentUser}
                    value={user.role}
                    onChange={(role) =>
                      updateSystemRole(
                        { userId: user.id, role },
                        {
                          onSuccess: () =>
                            toast.success(
                              `System role updated to ${role} for ${user.display}`,
                            ),
                        },
                      )
                    }
                  />
                </div>
                <OfficerCapabilities
                  user={user}
                  canEdit={hasAuthority(currentUser, 'roles')}
                  pending={capabilitiesPending}
                  onChange={(change) =>
                    updateCapabilities({ userId: user.id, ...change })
                  }
                />
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
                    disabled={!hasAuthority(currentUser, 'users')}
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
                <div className="w-1/6">
                  {isToggleableStatus ? (
                    <Toggle
                      className="w-full justify-center"
                      variant="outline"
                      aria-label={`Set ${user.display} to ${
                        isActive ? 'inactive' : 'active'
                      }`}
                      disabled={
                        !hasAuthority(currentUser, 'users') ||
                        user.id in pendingStatuses
                      }
                      pressed={isActive}
                      onPressedChange={(pressed) => {
                        const nextStatus = pressed ? 'active' : 'inactive';
                        setPendingStatuses((prev) => ({
                          ...prev,
                          [user.id]: nextStatus,
                        }));

                        updateUserStatus(
                          {
                            userId: user.id,
                            status: nextStatus,
                          },
                          {
                            onError: () => {
                              setPendingStatuses((prev) => {
                                const next = { ...prev };
                                delete next[user.id];
                                return next;
                              });
                            },
                            onSuccess: async () => {
                              const fullName = [user.nameFirst, user.nameLast]
                                .filter(Boolean)
                                .join(' ');
                              toast.success(
                                `${fullName} is now ${formatStatusLabel(nextStatus)}`,
                              );
                              await Promise.all([
                                queryClient.invalidateQueries({
                                  queryKey: allUsersQuery().queryKey,
                                }),
                                queryClient.invalidateQueries({
                                  queryKey: userByIdQuery(user.id).queryKey,
                                }),
                              ]);
                              setPendingStatuses((prev) => {
                                const next = { ...prev };
                                delete next[user.id];
                                return next;
                              });
                            },
                          },
                        );
                      }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Toggle>
                  ) : (
                    <Badge variant="secondary">
                      {formatStatusLabel(resolvedStatus)}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div>
                          <Button size="icon">
                            <IconUserCancel />
                          </Button>
                        </div>
                      }
                    />
                    <TooltipContent sideOffset={8}>
                      {isToggleableStatus
                        ? isActive
                          ? 'Deactivate user'
                          : 'Activate user'
                        : 'Cannot change status of an invited user'}
                    </TooltipContent>
                  </Tooltip>
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
