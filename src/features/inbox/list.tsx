import { Button } from '~/components/ui';
import { useState } from 'react';

export type InboxNotice = {
  id: string;
  kind: string;
  body: string;
  userCertificationId: string;
  userId: string;
  userDisplay: string;
  certificationDisplay: string;
  status: string;
  version: number;
  readAt: string | null;
  dismissedAt: string | null;
  resolvedAt: string | null;
};
type Review = {
  id: string;
  version: number;
  decision: 'approve' | 'reject';
  comment?: string;
};
type Props = {
  notices: InboxNotice[];
  canReview: boolean;
  onState: (id: string, state: 'read' | 'dismiss') => Promise<unknown>;
  onReview: (data: Review) => Promise<unknown>;
};
export function InboxList({ notices, ...actions }: Props) {
  if (notices.length === 0) return <p>Your inbox is clear.</p>;
  return (
    <ul className="grid gap-4">
      {notices.map((notice) => (
        <InboxItem
          key={`${notice.id}:${notice.version}`}
          notice={notice}
          {...actions}
        />
      ))}
    </ul>
  );
}
function InboxItem({
  notice,
  canReview,
  onState,
  onReview,
}: Omit<Props, 'notices'> & { notice: InboxNotice }) {
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError('');
    try {
      await action();
      setComment('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to change this item. Refresh and try again.',
      );
    } finally {
      setPending(false);
    }
  }
  const shared = notice.kind === 'certification-review';
  return (
    <li className="grid gap-3 rounded border p-4">
      <h2 className="text-lg font-semibold">
        {shared ? notice.certificationDisplay : 'Certification review outcome'}
      </h2>
      {shared && (
        <p>
          {notice.userDisplay} · {notice.status}
        </p>
      )}
      <p className="whitespace-pre-wrap">{notice.body}</p>
      {notice.resolvedAt && <p>Resolved</p>}
      {notice.dismissedAt && <p>Dismissed for you</p>}
      <div className="flex gap-2">
        <Button
          disabled={pending || !!notice.readAt}
          variant="outline"
          onClick={() => void run(() => onState(notice.id, 'read'))}
        >
          {notice.readAt ? 'Read' : 'Mark read'}
        </Button>
        <Button
          disabled={pending || !!notice.dismissedAt}
          variant="outline"
          onClick={() => void run(() => onState(notice.id, 'dismiss'))}
        >
          Dismiss
        </Button>
      </div>
      {shared &&
        canReview &&
        !notice.resolvedAt &&
        notice.status === 'pending' && (
          <fieldset disabled={pending} className="grid gap-2">
            <legend className="font-medium">Review certification</legend>
            <label htmlFor={`comment-${notice.id}`}>
              Reviewer comment
              <textarea
                id={`comment-${notice.id}`}
                className="mt-1 block w-full rounded border p-2"
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  void run(() =>
                    onReview({
                      id: notice.userCertificationId,
                      version: notice.version,
                      decision: 'approve',
                    }),
                  )
                }
              >
                Approve certification
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void run(() =>
                    onReview({
                      id: notice.userCertificationId,
                      version: notice.version,
                      decision: 'reject',
                      comment,
                    }),
                  )
                }
              >
                Reject certification
              </Button>
            </div>
          </fieldset>
        )}
      {error && <p role="alert">{error}</p>}
    </li>
  );
}
