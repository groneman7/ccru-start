import { Button, Input } from '~/components/ui';
import {
  buildCertificationTree,
  collectCertificationDescendantIds,
} from '~/features/users/certifications';
import { createCertificationSchema } from '~/features/users/schema';
import { useState } from 'react';
import type { infer as Infer } from 'zod';

type Fields = Infer<typeof createCertificationSchema>;
type Definition = Fields & { id: string };
type Props = {
  certification?: Definition;
  certifications: Definition[];
  canManage: boolean;
  onSave: (data: Fields) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
};
export function CertificationEditor(props: Props) {
  const record = props.certification;
  return (
    <CertificationForm
      key={
        record
          ? JSON.stringify([
              record.id,
              record.name,
              record.display,
              record.parent,
            ])
          : 'new'
      }
      {...props}
    />
  );
}
function CertificationForm({
  certification,
  certifications,
  canManage,
  onSave,
  onRemove,
}: Props) {
  const [editing, setEditing] = useState(!certification);
  const [draft, setDraft] = useState<Fields>(() =>
    certification
      ? {
          name: certification.name,
          display: certification.display,
          parent: certification.parent,
        }
      : { name: '', display: '', parent: null },
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const excluded = certification
    ? collectCertificationDescendantIds(certifications, certification.id)
    : new Set<string>();
  const parents = buildCertificationTree(certifications).filter(
    ({ certification: candidate }) =>
      candidate.id !== certification?.id && !excluded.has(candidate.id),
  );
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not change the certification.',
      );
    } finally {
      setPending(false);
    }
  }
  if (!certification && !canManage)
    return <p>You do not have permission to manage certifications.</p>;
  return (
    <section className="grid max-w-lg gap-4">
      <h2 className="text-xl font-semibold">
        {certification ? 'Certification details' : 'New certification'}
      </h2>
      {certification && (!editing || !canManage) ? (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-3">
            <dt>Display name</dt>
            <dd>{certification.display}</dd>
            <dt>Name</dt>
            <dd>{certification.name}</dd>
            <dt>Parent</dt>
            <dd>
              {certifications.find(
                (parent) => parent.id === certification.parent,
              )?.display ?? 'No parent'}
            </dd>
          </dl>
          {canManage && (
            <div className="flex gap-2">
              <Button
                disabled={pending}
                onClick={() => {
                  setEditing(true);
                  setError('');
                }}
              >
                Edit certification
              </Button>
              {onRemove && (
                <Button
                  disabled={pending}
                  variant="outline"
                  onClick={() => void run(onRemove)}
                >
                  Delete certification
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const result = createCertificationSchema.safeParse(draft);
              if (!result.success)
                throw new Error(
                  result.error.issues.map((issue) => issue.message).join('. '),
                );
              await onSave(result.data);
              setEditing(false);
            });
          }}
        >
          <fieldset disabled={pending} className="grid gap-3">
            <legend className="sr-only">Certification definition</legend>
            <label htmlFor="certification-name">
              Name
              <Input
                id="certification-name"
                required
                maxLength={100}
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label htmlFor="certification-display">
              Display name
              <Input
                id="certification-display"
                required
                maxLength={200}
                value={draft.display}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    display: event.target.value,
                  }))
                }
              />
            </label>
            <label htmlFor="certification-parent">
              Parent
              <select
                id="certification-parent"
                className="ml-3 rounded border p-2"
                value={draft.parent ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    parent: event.target.value || null,
                  }))
                }
              >
                <option value="">No parent</option>
                {parents.map(({ certification: parent, depth }) => (
                  <option
                    key={parent.id}
                    value={parent.id}
                  >{`${'— '.repeat(depth)}${parent.display}`}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button type="submit">
                {pending ? 'Saving…' : 'Save certification'}
              </Button>
              {certification && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft({
                      name: certification.name,
                      display: certification.display,
                      parent: certification.parent,
                    });
                    setError('');
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
