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
import { hasAuthority, SYSTEM_ROLES } from '~/server/permissions/policy';
import type { AuthorityUser, SystemRole } from '~/server/permissions/policy';

export function SystemRoleSelect({
  actor,
  value,
  onChange,
}: {
  actor: AuthorityUser;
  value: string;
  onChange: (role: SystemRole) => void;
}) {
  const disabled =
    !hasAuthority(actor, 'roles') ||
    (value === 'Developer' && actor.role !== 'Developer');
  return (
    <Combobox
      disabled={disabled}
      value={value}
      items={SYSTEM_ROLES.filter(
        (role) =>
          actor.role === 'Developer' ||
          role !== 'Developer' ||
          value === 'Developer',
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
