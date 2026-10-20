import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { ForcedSubject, MongoAbility } from '@casl/ability';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import type { SystemRole } from '~/features/authz/schema';

export type PermissionUser = {
  id: string;
  role?: string | null;
  deletedAt?: string | Date | null;
  status?: string | null;
  canManageScheduling?: boolean;
  canManageUsers?: boolean;
};

type UserSubject = 'User' | (ForcedSubject<'User'> & { id: string });
type RoleSubject =
  | 'SystemRole'
  | (ForcedSubject<'SystemRole'> & {
      currentRole?: string;
      nextRole?: string;
    });
export type Permission =
  | ['create' | 'read' | 'update' | 'delete' | 'restore', 'CalendarEvent']
  | ['create' | 'read' | 'update' | 'restore', 'Position']
  | ['create' | 'modify' | 'delete' | 'restore', 'Shift']
  | ['create' | 'read' | 'update' | 'delete' | 'restore', 'Slot']
  | ['read' | 'update' | 'restore', 'Template']
  | ['read' | 'create' | 'update' | 'restore', 'Certification']
  | ['read' | 'list' | 'update' | 'update-status' | 'update-type', UserSubject]
  | ['read' | 'assign', RoleSubject]
  | ['update', 'OfficerCapabilities']
  | ['read' | 'create' | 'update' | 'delete', 'UserType']
  | ['create' | 'read' | 'update' | 'delete' | 'restore', 'SavedLocation']
  | ['dev-tools' | 'impersonate' | 'manage-sessions', 'System'];
export type UserPermissions = MongoAbility<Permission>;

export function getUserPermissions(user?: PermissionUser | null) {
  const { build, can: allow } = new AbilityBuilder<UserPermissions>(
    createMongoAbility,
  );
  if (
    !user ||
    user.deletedAt ||
    !SYSTEM_ROLES.includes(user.role as SystemRole)
  )
    return build();
  if (user.status !== 'active' && user.status !== 'invited') return build();

  allow('read', 'User', { id: user.id });
  allow('update', 'User', { id: user.id });
  if (user.status !== 'active') return build();

  allow('read', [
    'CalendarEvent',
    'Position',
    'Slot',
    'Template',
    'Certification',
    'SystemRole',
    'UserType',
  ]);

  const administrator =
    user.role === 'Administrator' || user.role === 'Developer';
  if (administrator || user.role === 'Officer') {
    allow(['read', 'list'], 'User');
    allow(['create', 'read', 'update', 'delete'], 'SavedLocation');
  }
  if (
    administrator ||
    (user.role === 'Officer' && user.canManageScheduling === true)
  ) {
    allow(['create', 'update', 'delete'], 'CalendarEvent');
    allow(['create', 'update'], 'Position');
    allow(['create', 'modify', 'delete'], 'Shift');
    allow(['create', 'update', 'delete'], 'Slot');
    allow('update', 'Template');
  }
  if (
    administrator ||
    (user.role === 'Officer' && user.canManageUsers === true)
  ) {
    allow(['update', 'update-status', 'update-type'], 'User');
    allow(['create', 'update'], 'Certification');
    allow(['create', 'update', 'delete'], 'UserType');
  }
  if (administrator) {
    allow('update', 'OfficerCapabilities');
    allow('assign', 'SystemRole', {
      currentRole: { $ne: 'Developer' },
      nextRole: { $ne: 'Developer' },
    });
  }
  if (user.role === 'Developer') {
    allow('assign', 'SystemRole');
    allow(['dev-tools', 'impersonate', 'manage-sessions'], 'System');
    allow('restore', [
      'CalendarEvent',
      'Position',
      'Shift',
      'Slot',
      'Template',
      'Certification',
      'SavedLocation',
    ]);
  }
  return build();
}
