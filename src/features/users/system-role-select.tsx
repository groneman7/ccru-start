import { subject } from '@casl/ability';
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '~/components/ui';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import type { SystemRole } from '~/features/authz/schema';
import { getUserPermissions } from '~/server/permissions';
import type { PermissionUser } from '~/server/permissions';

export function SystemRoleSelect({
  actor,
  value,
  onChange,
}: {
  actor: PermissionUser;
  value: string;
  onChange: (role: SystemRole) => void;
}) {
  const permissions = getUserPermissions(actor);
  const disabled = !permissions.can(
    'assign',
    subject('SystemRole', { currentRole: value }),
  );
  return (
    <Combobox
      disabled={disabled}
      value={value}
      items={SYSTEM_ROLES.filter(
        (role) =>
          role === value ||
          permissions.can(
            'assign',
            subject('SystemRole', { currentRole: value, nextRole: role }),
          ),
      )}
      onValueChange={(role) => {
        if (role && !disabled) onChange(role as SystemRole);
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            aria-label="System role"
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
          {(role: string) => (
            <ComboboxItem key={role} value={role}>
              {role}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
