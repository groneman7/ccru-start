import { usePostHog } from '@posthog/react';
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
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { CircleUserRound } from 'lucide-react';

export function AppSidebar() {
  const posthog = usePostHog();
  const { currentUser } = useRouteContext({ from: '/_authed' });
  const { signOut } = authClient;
  const nav = useNavigate();

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
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Link /* to="/admin" */ to="/">Admin</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                        {currentUser.displayName}
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
                {currentUser.isImpersonated ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      const response =
                        await authClient.admin.stopImpersonating();
                      if (response.error) return;
                      posthog.capture('impersonation_stopped');
                      nav({ reloadDocument: true });
                    }}
                  >
                    Stop impersonating
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      posthog.capture('user_signed_out');
                      posthog.reset();
                      signOut();
                      nav({ to: '/sign-in' });
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
