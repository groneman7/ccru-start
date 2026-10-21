import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { ForcedSubject, MongoAbility } from '@casl/ability';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import type { SystemRole } from '~/features/authz/schema';
import { canAccessWorkspace } from '~/features/users/onboarding';
import type { OnboardingIdentity } from '~/features/users/onboarding';

export type PermissionUser = OnboardingIdentity & {
  id: string;
  role?: string | null;
  deletedAt?: string | Date | null;
  status?: string | null;
  canManageScheduling?: boolean;
  canManageUsers?: boolean;
};

type UserSubject = 'User' | (ForcedSubject<'User'> & { id: string });
type UserCertificationSubject =
  | 'UserCertification'
  | (ForcedSubject<'UserCertification'> & { userId: string; status?: string });
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
  | ['read' | 'create' | 'update' | 'delete' | 'restore', 'Certification']
  | [
      (
        | 'read'
        | 'list'
        | 'update'
        | 'update-status'
        | 'update-type'
        | 'complete-onboarding'
      ),
      UserSubject,
    ]
  | ['read' | 'assign', RoleSubject]
  | ['update', 'OfficerCapabilities']
  | ['update', 'RegistrationMode']
  | ['read', 'Inbox']
  | ['read' | 'submit' | 'edit' | 'remove' | 'review', UserCertificationSubject]
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
  allow('complete-onboarding', 'User', { id: user.id });
  if (!canAccessWorkspace(user)) return build();

  allow('read', 'Inbox');
  allow(['read', 'submit'], 'UserCertification', { userId: user.id });
  allow('edit', 'UserCertification', {
    userId: user.id,
    status: { $in: ['pending', 'rejected'] },
  });
  allow('remove', 'UserCertification', { userId: user.id, status: 'pending' });
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
    allow('read', 'UserCertification');
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
    allow(['create', 'update', 'delete'], 'Certification');
    allow(['read', 'submit', 'edit', 'remove', 'review'], 'UserCertification');
    allow(['create', 'update', 'delete'], 'UserType');
  }
  if (administrator) {
    allow('update', 'OfficerCapabilities');
    allow('update', 'RegistrationMode');
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
