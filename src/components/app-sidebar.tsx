// import { usePostHog } from '@posthog/react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router';
// import { SignedOut } from '~/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui';
import { authSessionQueryKey } from '~/features/auth/queries';
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { getUserPermissions } from '~/server/permissions';
import { CircleUserRound } from 'lucide-react';

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
                <Link to="/calendar">
                  <SidebarMenuButton>Calendar</SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {permissions.can('manage', 'System') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Link to="/admin">Admin</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
                        <CircleUserRound className="size-8 rounded-full bg-slate-50 text-slate-500" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center text-left">
                      <span className="text-base leading-5 font-semibold">
                        {currentUser.display}
                      </span>
                      <span className="text-xs text-slate-600">
                        {/* {currentUser.userType?.display} */}
                        User type
                      </span>
                    </div>
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width]"
                align="start"
              >
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
