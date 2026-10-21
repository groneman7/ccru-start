// import { usePostHog } from '@posthog/react';
import {
  IconBriefcase,
  IconCalendarWeek,
  IconCertificate2,
  IconChevronRight,
  IconPointer2,
  IconUserCircle,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router';
// import { SignedOut } from '~/components';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '~/components/ui';
import { authSessionQueryKey } from '~/features/auth/queries';
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { getUserPermissions } from '~/server/permissions';

export function AppSidebar() {
  // const posthog = usePostHog();
  const { currentUser } = useRouteContext({ from: '/_authed' });
  const { signOut } = authClient;
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const permissions = getUserPermissions(currentUser);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="px-4 pt-4">
        <span
          className={cn(
            'cursor-pointer font-(family-name:--temp-logo-font)! text-3xl font-black select-none',
            'bg-clip-text text-transparent',
            'bg-linear-120 from-sky-600 to-teal-400',
          )}
          onClick={() => nav({ to: '/' })}
        >
          CCRU
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Calendar"
                  render={<Link to="/calendar" />}
                >
                  <IconCalendarWeek />
                  Calendar
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {permissions.can('list', 'User') ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin Tools</SidebarGroupLabel>
            <SidebarMenu>
              {permissions.can('update', 'RegistrationMode') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Organization settings"
                    render={<Link to="/admin/settings" />}
                  >
                    <IconBriefcase />
                    Organization settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Certifications"
                  render={<Link to="/admin/certifications" />}
                >
                  <IconCertificate2 />
                  Certifications
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Positions"
                  render={<Link to="/admin/positions" />}
                >
                  <IconBriefcase />
                  Positions
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="User types"
                  render={<Link to="/admin/user-types" />}
                >
                  <IconUserCircle />
                  User types
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Users"
                  render={<Link to="/admin/users" />}
                >
                  <IconUserCircle />
                  Users
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
        {permissions.can('dev-tools', 'System') ? (
          <SidebarGroup>
            <SidebarGroupLabel>Developer Tools</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="UI Testing">
                      <IconPointer2 />
                      <span>UI Testing</span>
                      <IconChevronRight className="ml-auto transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link to="/" />}>
                          Pragmatic DnD Tree
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    className="flex h-12 items-center gap-2"
                    aria-label="Account menu"
                  >
                    <div className="rounded-full bg-slate-50 p-0.5">
                      {currentUser.image ? (
                        <img
                          src={currentUser.image}
                          // alt={`${currentUser.nameFirst} ${currentUser.nameLast}`}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <IconUserCircle className="size-8 rounded-full bg-slate-50 text-slate-500" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center text-left">
                      <span className="text-base leading-5 font-semibold">
                        {currentUser.display}
                      </span>
                      <span className="text-xs text-slate-600">
                        {currentUser.userType?.display}
                      </span>
                    </div>
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="start">
                {currentUser.impersonatedBy ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      const response =
                        await authClient.admin.stopImpersonating();
                      if (response.error) return;
                      queryClient.removeQueries({
                        queryKey: authSessionQueryKey,
                      });
                      // posthog.capture('impersonation_stopped');
                      nav({ reloadDocument: true });
                    }}
                  >
                    Stop impersonating
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={async () => {
                      // posthog.capture('user_signed_out');
                      // posthog.reset();
                      await signOut();
                      queryClient.removeQueries({
                        queryKey: authSessionQueryKey,
                      });
                      await nav({ to: '/sign-in' });
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
