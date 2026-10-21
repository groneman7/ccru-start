import { Button } from '~/components/ui';
import { useState } from 'react';

export function RegistrationModeControl({
  mode,
  canEdit,
  onSave,
}: {
  mode: 'open' | 'invitation-only';
  canEdit: boolean;
  onSave: (mode: 'open' | 'invitation-only') => Promise<unknown>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <section className="grid max-w-lg gap-4">
      <h2 className="text-xl font-semibold">Registration mode</h2>
      <p>
        Invitation-only prevents new accounts. Existing accounts can still sign
        in. Open registration activates volunteers after email verification and
        completed onboarding.
      </p>
      <p>
        Current mode:{' '}
        {mode === 'open' ? 'Open registration' : 'Invitation-only'}
      </p>
      {canEdit && (
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const next = data.get('mode');
            if (next !== 'open' && next !== 'invitation-only') return;
            setPending(true);
            setError('');
            setNotice('');
            try {
              await onSave(next);
              setNotice('Registration mode saved.');
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not save registration mode.',
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label htmlFor="registration-mode">
            Registration mode
            <select
              key={mode}
              id="registration-mode"
              name="mode"
              defaultValue={mode}
              disabled={pending}
              className="ml-3 rounded border p-2"
            >
              <option value="invitation-only">Invitation-only</option>
              <option value="open">Open registration</option>
            </select>
          </label>
          <Button disabled={pending} type="submit">
            {pending ? 'Saving…' : 'Save registration mode'}
          </Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
