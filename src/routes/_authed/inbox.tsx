import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { Button } from '~/components/ui';
import { inboxServerFns } from '~/features/inbox/functions';
import { InboxList } from '~/features/inbox/list';
import { inboxQuery } from '~/features/inbox/queries';
import { userCertificationServerFns } from '~/features/user-certifications/functions';
import { getUserPermissions } from '~/server/permissions';
import { useState } from 'react';

export const Route = createFileRoute('/_authed/inbox')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(inboxQuery()),
  component: InboxPage,
});
function InboxPage() {
  const { currentUser } = Route.useRouteContext();
  const client = useQueryClient();
  const [history, setHistory] = useState(false);
  const {
    data: notices = [],
    error,
    isPending,
  } = useQuery(inboxQuery(history));
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['inbox'] }),
      client.invalidateQueries({ queryKey: ['user-certifications'] }),
    ]);
  }
  return (
    <>
      <WorkspaceHeader>Inbox</WorkspaceHeader>
      <WorkspaceContent>
        <div className="mb-4 flex gap-4">
          <label>
            <input
              type="checkbox"
              checked={history}
              onChange={(event) => setHistory(event.target.checked)}
            />{' '}
            Show resolved and dismissed items
          </label>
          <Button variant="outline" onClick={() => void refresh()}>
            Refresh inbox
          </Button>
        </div>
        {error ? (
          <p role="alert">{error.message}</p>
        ) : isPending ? (
          <p>Loading inbox…</p>
        ) : (
          <InboxList
            notices={notices}
            canReview={getUserPermissions(currentUser).can(
              'review',
              'UserCertification',
            )}
            onState={async (notificationId, state) => {
              await inboxServerFns.setState({
                data: { notificationId, state },
              });
              await refresh();
            }}
            onReview={async (data) => {
              await userCertificationServerFns.review({ data });
              await refresh();
            }}
          />
        )}
      </WorkspaceContent>
    </>
  );
}
