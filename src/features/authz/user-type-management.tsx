import { Button, Input } from '~/components/ui';
import { useState } from 'react';

type UserType = { id: string; display: string };
export function UserTypeManagement({
  types,
  canManage,
  onCreate,
  onRename,
  onRemove,
}: {
  types: UserType[];
  canManage: boolean;
  onCreate: (display: string) => Promise<unknown>;
  onRename: (id: string, display: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not update user types',
      );
      return false;
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">User types</h1>
      <p className="text-muted-foreground">
        Reusable profile labels. These labels do not change roles, permissions
        or scheduling eligibility.
      </p>
      {canManage && (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const display = String(new FormData(form).get('display') ?? '');
            if (await run(() => onCreate(display), 'User type created'))
              form.reset();
          }}
        >
          <label htmlFor="new-user-type">New user type</label>
          <div className="flex gap-2">
            <Input
              id="new-user-type"
              name="display"
              required
              maxLength={100}
              disabled={pending}
            />
            <Button type="submit" disabled={pending}>
              Create user type
            </Button>
          </div>
        </form>
      )}
      {types.length === 0 && <p>No user types yet.</p>}
      <ul className="flex flex-col gap-3">
        {types.map((type) => (
          <li
            key={`${type.id}:${type.display}`}
            className="rounded-md border p-3"
          >
            {canManage ? (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const display = String(
                    new FormData(event.currentTarget).get('display') ?? '',
                  );
                  void run(
                    () => onRename(type.id, display),
                    'User type renamed',
                  );
                }}
              >
                <label
                  className="flex min-w-48 flex-1 flex-col gap-1"
                  htmlFor={`type-${type.id}`}
                >
                  Rename {type.display}
                  <Input
                    id={`type-${type.id}`}
                    name="display"
                    defaultValue={type.display}
                    required
                    maxLength={100}
                    disabled={pending}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={pending}
                  aria-label={`Save ${type.display}`}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  aria-label={`Delete ${type.display}`}
                  onClick={() =>
                    void run(() => onRemove(type.id), 'User type deleted')
                  }
                >
                  Delete
                </Button>
              </form>
            ) : (
              <span>{type.display}</span>
            )}
          </li>
        ))}
      </ul>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
