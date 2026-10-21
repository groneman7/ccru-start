// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { OfficerCapabilities } from '../src/features/users/officer-capabilities';
import type { OfficerCapabilityChange } from '../src/features/users/officer-capabilities';
import { SystemRoleSelect } from '../src/features/users/system-role-select';

afterEach(cleanup);
test('capability controls send independent changes and show the existing grants', () => {
  const changes: OfficerCapabilityChange[] = [];
  render(
    <OfficerCapabilities
      user={{
        role: 'Officer',
        canManageScheduling: false,
        canManageUsers: true,
      }}
      canEdit
      pending={false}
      onChange={(change) => changes.push(change)}
    />,
  );
  const scheduling = screen.getByLabelText(
    'Scheduling management',
  ) as HTMLInputElement;
  const users = screen.getByLabelText('User management') as HTMLInputElement;
  expect(scheduling.checked).toBe(false);
  expect(users.checked).toBe(true);
  fireEvent.click(scheduling);
  expect(changes).toEqual([{ canManageScheduling: true }]);
});
test('Officers can see grant state without receiving delegation controls', () => {
  render(
    <OfficerCapabilities
      user={{
        role: 'Officer',
        canManageScheduling: true,
        canManageUsers: false,
      }}
      canEdit={false}
      pending={false}
      onChange={() => {
        throw new Error('Must not delegate');
      }}
    />,
  );
  expect(screen.getByRole('group').hasAttribute('disabled')).toBe(true);
});
test('ordinary Users have no capability controls', () => {
  render(
    <OfficerCapabilities
      user={{ role: 'User', canManageScheduling: false, canManageUsers: false }}
      canEdit
      pending={false}
      onChange={() => {
        throw new Error('No grants for Users');
      }}
    />,
  );
  expect(screen.queryByRole('group')).toBe(null);
});

test.each([
  ['Developer', 'Developer', false],
  ['Administrator', 'Developer', true],
  ['Administrator', 'User', false],
  ['Officer', 'User', true],
])(
  '%s editing %s has the correct role control availability',
  (actorRole, targetRole, disabled) => {
    render(
      <SystemRoleSelect
        actor={{
          id: 'fixture',
          role: actorRole,
          status: 'active',
          emailVerified: true,
          nameFirst: 'Fixture',
          nameLast: 'Actor',
          phoneNumber: '+15550100100',
          timestampOnboardingCompleted: '2026-01-03',
        }}
        value={targetRole}
        onChange={() => {}}
      />,
    );
    expect(
      (screen.getByLabelText('System role') as HTMLButtonElement).disabled,
    ).toBe(disabled);
  },
);
