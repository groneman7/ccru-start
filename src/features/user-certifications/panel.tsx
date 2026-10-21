import { Button } from '~/components/ui';
import { useState } from 'react';

export type UserCertificationRecord = {
  id: string;
  certificationId: string;
  display: string;
  status: string;
  version: number;
  editable: boolean;
  removable: boolean;
};
type Definition = { id: string; display: string };
type Edit = { id: string; version: number; certificationId: string };
type Remove = { id: string; version: number };
export function UserCertificationPanel({
  records,
  definitions,
  canSubmit,
  canReview,
  onCreate,
  onEdit,
  onRemove,
}: {
  records: UserCertificationRecord[];
  definitions: Definition[];
  canSubmit: boolean;
  canReview: boolean;
  onCreate: (certificationId: string) => Promise<unknown>;
  onEdit: (data: Edit) => Promise<unknown>;
  onRemove: (data: Remove) => Promise<unknown>;
}) {
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-semibold">Certifications</h2>
      {canSubmit && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!selected) return;
            setPending(true);
            setError('');
            setNotice('');
            try {
              await onCreate(selected);
              setSelected('');
              setNotice(
                canReview
                  ? 'Verified certification added.'
                  : 'Certification submitted for review.',
              );
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Unable to submit certification.',
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label htmlFor="new-user-certification">
            Certification to submit
            <select
              id="new-user-certification"
              className="ml-2 rounded border p-2"
              required
              value={selected}
              disabled={pending}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Select a certification</option>
              {definitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={pending || !selected}>
            {canReview ? 'Add verified certification' : 'Submit certification'}
          </Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {records.length === 0 && <p>No certifications recorded.</p>}
      <ul className="grid gap-3">
        {records.map((record) => (
          <CertificationRow
            key={`${record.id}:${record.version}`}
            record={record}
            definitions={definitions}
            canReview={canReview}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </section>
  );
}
function CertificationRow({
  record,
  definitions,
  canReview,
  onEdit,
  onRemove,
}: {
  record: UserCertificationRecord;
  definitions: Definition[];
  canReview: boolean;
  onEdit: (data: Edit) => Promise<unknown>;
  onRemove: (data: Remove) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(record.certificationId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError('');
    try {
      await action();
      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to change certification.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <li className="grid gap-2 rounded border p-3">
      <h3 className="font-medium">{record.display}</h3>
      <p>Status: {record.status}</p>
      {editing ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              onEdit({
                id: record.id,
                version: record.version,
                certificationId: selected,
              }),
            );
          }}
        >
          <label htmlFor={`change-${record.id}`}>
            Change certification
            <select
              id={`change-${record.id}`}
              className="ml-2 rounded border p-2"
              value={selected}
              disabled={pending}
              onChange={(event) => setSelected(event.target.value)}
            >
              {definitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {record.status === 'rejected'
                ? 'Resubmit certification'
                : 'Save submission'}
            </Button>
            <Button
              type="button"
              disabled={pending}
              variant="outline"
              onClick={() => {
                setEditing(false);
                setSelected(record.certificationId);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          {record.editable && (
            <Button disabled={pending} onClick={() => setEditing(true)}>
              {record.status === 'rejected'
                ? 'Edit and resubmit'
                : 'Edit submission'}
            </Button>
          )}
          {record.removable && (
            <Button
              disabled={pending}
              variant="outline"
              onClick={() =>
                void run(() =>
                  onRemove({ id: record.id, version: record.version }),
                )
              }
            >
              {canReview ? 'Remove certification' : 'Withdraw submission'}
            </Button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </li>
  );
}
