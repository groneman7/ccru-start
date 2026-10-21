// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { InboxList } from '../src/features/inbox/list';
import { UserCertificationPanel } from '../src/features/user-certifications/panel';

afterEach(cleanup);
const definition = { id: 'qualification', display: 'Clinical training' };
const row = {
  id: 'submission',
  certificationId: definition.id,
  display: definition.display,
  status: 'pending' as const,
  version: 1,
  editable: true,
  removable: true,
};
test('volunteers can select, submit, edit and withdraw a pending qualification', async () => {
  const actions: unknown[] = [];
  render(
    <UserCertificationPanel
      records={[row]}
      definitions={[definition, { id: 'other', display: 'Specialty' }]}
      canSubmit
      canReview={false}
      onCreate={async (id) => {
        actions.push(['create', id]);
      }}
      onEdit={async (data) => {
        actions.push(['edit', data]);
      }}
      onRemove={async (data) => {
        actions.push(['remove', data]);
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Certification to submit'), {
    target: { value: 'other' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit certification' }));
  await waitFor(() => expect(actions).toContainEqual(['create', 'other']));
  fireEvent.click(screen.getByRole('button', { name: 'Edit submission' }));
  fireEvent.change(screen.getByLabelText('Change certification'), {
    target: { value: 'other' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save submission' }));
  await waitFor(() =>
    expect(actions).toContainEqual([
      'edit',
      { id: 'submission', version: 1, certificationId: 'other' },
    ]),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw submission' }));
  await waitFor(() =>
    expect(actions).toContainEqual([
      'remove',
      { id: 'submission', version: 1 },
    ]),
  );
});
const notice = {
  id: 'notice',
  kind: 'certification-review',
  body: 'Original delivered text.',
  userCertificationId: 'submission',
  userId: 'user',
  userDisplay: 'Volunteer',
  certificationDisplay: 'Current qualification',
  status: 'pending',
  version: 2,
  readAt: null,
  dismissedAt: null,
  resolvedAt: null,
};
test('inbox reviewers see current qualification and can reject with a comment', async () => {
  const actions: unknown[] = [];
  render(
    <InboxList
      notices={[notice]}
      canReview
      onState={async () => {}}
      onReview={async (data) => {
        actions.push(data);
      }}
    />,
  );
  expect(screen.getByText('Current qualification')).toBeTruthy();
  expect(screen.getByText('Original delivered text.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Reviewer comment'), {
    target: { value: 'Please correct this.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reject certification' }));
  await waitFor(() =>
    expect(actions).toEqual([
      {
        id: 'submission',
        version: 2,
        decision: 'reject',
        comment: 'Please correct this.',
      },
    ]),
  );
});
test('personal messages have read and dismissal controls but no review authority', async () => {
  const actions: unknown[] = [];
  render(
    <InboxList
      notices={[{ ...notice, kind: 'certification-rejected' }]}
      canReview={false}
      onState={async (id, state) => {
        actions.push([id, state]);
      }}
      onReview={async () => {
        throw new Error('Denied');
      }}
    />,
  );
  expect(
    screen.queryByRole('button', { name: 'Approve certification' }),
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
  await waitFor(() => expect(actions).toContainEqual(['notice', 'read']));
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  await waitFor(() => expect(actions).toContainEqual(['notice', 'dismiss']));
});

test('rejected submissions resubmit the same record, while viewing alone exposes no mutations', async () => {
  const edited: unknown[] = [];
  const props = {
    definitions: [definition],
    canSubmit: false,
    canReview: false,
    onCreate: async () => {},
    onEdit: async (data: unknown) => {
      edited.push(data);
    },
    onRemove: async () => {},
  };
  const { rerender } = render(
    <UserCertificationPanel
      {...props}
      records={[{ ...row, status: 'rejected', version: 3, removable: false }]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit and resubmit' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Resubmit certification' }),
  );
  await waitFor(() =>
    expect(edited).toEqual([
      { id: 'submission', version: 3, certificationId: definition.id },
    ]),
  );
  rerender(
    <UserCertificationPanel
      {...props}
      records={[{ ...row, editable: false, removable: false }]}
    />,
  );
  expect(screen.queryByRole('button')).toBeNull();
});
test('review failures leave the pending item visible and explain the stale version', async () => {
  render(
    <InboxList
      notices={[notice]}
      canReview
      onState={async () => {}}
      onReview={async () => {
        throw new Error('Submission changed; refresh before trying again');
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Approve certification' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Submission changed; refresh before trying again',
  );
  expect(screen.getByText('Current qualification')).toBeTruthy();
});
