import type { MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { userSchema } from '~/features/admin/users.schema';
import type { infer as Infer } from 'zod';

type CalendarEventSubject = 'CalendarEvent';
type CalendarEventPermission = [
  'create' | 'update' | 'delete',
  CalendarEventSubject,
];

type ShiftSubject = 'Shift';
type ShiftPermission = ['modify', ShiftSubject];

type Permissions = CalendarEventPermission | ShiftPermission;
const NON_STANDARD_SYSTEM_ROLES = [
  '019c0720-810b-7202-8891-bc4103197f07', // Officer
  '019c0720-810c-78cc-b3f1-48e219ec1ee7', // Developer
  '019c0720-810c-7ec6-9c74-ba2a6c3c0379', // Admin
];

export function getUserPermissions(user?: Infer<typeof userSchema> | null) {
  const {
    build,
    can: allow,
    // cannot: forbid,
  } = new AbilityBuilder<MongoAbility<Permissions>>(createMongoAbility);

  if (user) {
    // TODO: Temporary type assertion here, may want to do something more robust in the future
    if (NON_STANDARD_SYSTEM_ROLES.includes(user.systemRoleId!)) {
      allow('update', 'CalendarEvent');
      allow('modify', 'Shift');
    }
  }

  return build();
}
