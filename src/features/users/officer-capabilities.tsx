export type OfficerCapabilityChange = {
  canManageScheduling?: boolean;
  canManageUsers?: boolean;
};
export function OfficerCapabilities({
  user,
  canEdit,
  pending,
  onChange,
}: {
  user: { role: string; canManageScheduling: boolean; canManageUsers: boolean };
  canEdit: boolean;
  pending: boolean;
  onChange: (change: OfficerCapabilityChange) => void;
}) {
  if (user.role !== 'Officer') return null;
  return (
    <fieldset
      className="flex flex-col gap-1 text-sm"
      disabled={!canEdit || pending}
    >
      <legend className="font-medium">Officer capabilities</legend>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={user.canManageScheduling}
          onChange={(event) =>
            onChange({ canManageScheduling: event.target.checked })
          }
        />
        Scheduling management
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={user.canManageUsers}
          onChange={(event) =>
            onChange({ canManageUsers: event.target.checked })
          }
        />
        User management
      </label>
    </fieldset>
  );
}
