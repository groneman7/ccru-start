import type { MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { CurrentUser } from '~/server/auth';

type CalendarEventSubject = 'CalendarEvent';
type CalendarEventPermission = [
  'create' | 'update' | 'delete',
  CalendarEventSubject,
];

type ShiftSubject = 'Shift';
type ShiftPermission = ['modify', ShiftSubject];

type SystemSubject = 'System';
type SystemPermission = ['dev-tools' | 'impersonate' | 'manage', SystemSubject];

type Permissions = CalendarEventPermission | ShiftPermission | SystemPermission;

export function getUserPermissions(user?: CurrentUser) {
  const {
    build,
    can: allow,
    cannot: forbid,
  } = new AbilityBuilder<MongoAbility<Permissions>>(createMongoAbility);

  if (user && user.role) {
    if (user.role === 'Developer') {
      allow('impersonate', 'System');
      allow('dev-tools', 'System');
    } else {
      forbid('impersonate', 'System');
    }

    if (user.role !== 'User') {
      allow('update', 'CalendarEvent');
    }

    if (['Administrator', 'Developer'].includes(user.role)) {
      allow('modify', 'Shift');
      allow('manage', 'System');
    }
  }

  return build();
}
