import type { MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { CurrentUser } from '~/server/auth';
import { hasAuthority } from './policy';

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

  if (hasAuthority(user, 'restore')) {
    allow('impersonate', 'System');
    allow('dev-tools', 'System');
  } else forbid('impersonate', 'System');
  if (hasAuthority(user, 'scheduling')) {
    allow('create', 'CalendarEvent');
    allow('update', 'CalendarEvent');
    allow('delete', 'CalendarEvent');
    allow('modify', 'Shift');
  }
  if (hasAuthority(user, 'profiles')) allow('manage', 'System');

  return build();
}
