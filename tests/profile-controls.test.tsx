// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { UserTypeManagement } from '../src/features/authz/user-type-management';
import { ProfileEditor } from '../src/features/users/profile-editor';

afterEach(cleanup);
const profile = {
  nameFirst: 'Fixture',
  nameMiddle: null,
  nameLast: 'User',
  phoneNumber: null,
  image: null,
  postNominals: null,
};
test('a permitted profile form submits only normalized basic fields', async () => {
  const saved: unknown[] = [];
  render(
    <ProfileEditor
      profile={profile}
      canEdit
      onSave={async (data) => {
        saved.push(data);
      }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
  fireEvent.change(screen.getByLabelText('First name'), {
    target: { value: ' Alice ' },
  });
  fireEvent.change(screen.getByLabelText('Phone (with country code)'), {
    target: { value: '+1 (555) 010-0200' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() =>
    expect(saved).toEqual([
      { ...profile, nameFirst: 'Alice', phoneNumber: '+15550100200' },
    ]),
  );
});
test('read-only profile viewers have no editing control', () => {
  render(
    <ProfileEditor
      profile={profile}
      canEdit={false}
      onSave={async () => {
        throw new Error('Unauthorized');
      }}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull();
});
test('label controls create, rename, and surface a deletion rejection', async () => {
  const changes: unknown[] = [];
  render(
    <UserTypeManagement
      types={[{ id: 'label', display: 'Volunteer' }]}
      canManage
      onCreate={async (display) => {
        changes.push(['create', display]);
      }}
      onRename={async (id, display) => {
        changes.push(['rename', id, display]);
      }}
      onRemove={async () => {
        throw new Error('User type is assigned to a non-deleted profile');
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText('New user type'), {
    target: { value: 'Staff' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create user type' }));
  await waitFor(() => expect(changes).toEqual([['create', 'Staff']]));
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'Save Volunteer',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.change(screen.getByLabelText('Rename Volunteer'), {
    target: { value: 'Helper' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Volunteer' }));
  await waitFor(() =>
    expect(changes).toContainEqual(['rename', 'label', 'Helper']),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'Delete Volunteer',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete Volunteer' }));
  expect((await screen.findByRole('alert')).textContent).toBe(
    'User type is assigned to a non-deleted profile',
  );
});
test('viewing labels grants no mutation controls', () => {
  const denied = async () => {
    throw new Error('Unauthorized');
  };
  render(
    <UserTypeManagement
      types={[{ id: 'label', display: 'Volunteer' }]}
      canManage={false}
      onCreate={denied}
      onRename={denied}
      onRemove={denied}
    />,
  );
  expect(screen.getByText('Volunteer')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
