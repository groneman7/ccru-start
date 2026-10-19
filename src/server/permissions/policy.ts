export const SYSTEM_ROLES = [
  'User',
  'Officer',
  'Administrator',
  'Developer',
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type Authority =
  | 'authenticated'
  | 'profiles'
  | 'scheduling'
  | 'users'
  | 'roles'
  | 'locations'
  | 'restore';
export type AuthorityUser = {
  id: string;
  role?: string | null;
  status?: string | null;
  canManageScheduling?: boolean;
  canManageUsers?: boolean;
};

export function hasAuthority(
  user: AuthorityUser | null | undefined,
  authority: Authority,
) {
  if (
    !user ||
    user.status !== 'active' ||
    !SYSTEM_ROLES.includes(user.role as SystemRole)
  )
    return false;
  if (authority === 'restore') return user.role === 'Developer';
  if (authority === 'roles')
    return user.role === 'Administrator' || user.role === 'Developer';
  if (authority === 'authenticated') return true;
  if (user.role === 'Administrator' || user.role === 'Developer') return true;
  if (user.role !== 'Officer') return false;
  if (authority === 'profiles' || authority === 'locations') return true;
  return authority === 'scheduling'
    ? user.canManageScheduling === true
    : user.canManageUsers === true;
}
