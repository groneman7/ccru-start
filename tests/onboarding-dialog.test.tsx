// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { OnboardingForm } from '../src/features/registration/onboarding-form';

afterEach(cleanup);
const profile = {
  nameFirst: 'New',
  nameLast: 'Volunteer',
  nameMiddle: null,
  email: 'new@example.invalid',
  emailVerified: false,
  phoneNumber: null,
  image: null,
  postNominals: null,
};
test('onboarding requires a country-code phone and submits normalized details without authority fields', async () => {
  const saved: unknown[] = [];
  render(
    <OnboardingForm
      profile={profile}
      onSave={async (data) => {
        saved.push(data);
        return 'Profile saved. Verify your email.';
      }}
      onResend={async () => {}}
      onSignOut={async () => {}}
    />,
  );
  expect((screen.getByLabelText('Email') as HTMLInputElement).readOnly).toBe(
    true,
  );
  fireEvent.change(screen.getByLabelText('Middle name'), {
    target: { value: ' Q ' },
  });
  fireEvent.change(screen.getByLabelText('Phone (with country code)'), {
    target: { value: '5551234' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'country code',
  );
  expect(saved).toEqual([]);
  fireEvent.change(screen.getByLabelText('Phone (with country code)'), {
    target: { value: '+1 (555) 010-0200' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() =>
    expect(saved).toEqual([
      {
        nameFirst: 'New',
        nameMiddle: 'Q',
        nameLast: 'Volunteer',
        phoneNumber: '+15550100200',
        image: null,
        postNominals: null,
      },
    ]),
  );
  expect((await screen.findByRole('status')).textContent).toContain(
    'Verify your email',
  );
});
test('verification resend errors remain visible with a working sign-out action', async () => {
  const actions: string[] = [];
  render(
    <OnboardingForm
      profile={profile}
      onSave={async () => ''}
      onResend={async () => {
        throw new Error('Unable to send verification');
      }}
      onSignOut={async () => {
        actions.push('signed-out');
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Resend verification email' }),
  );
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Unable to send verification',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(actions).toEqual(['signed-out']));
});

test('registration mode control saves the selected mode and exposes failures', async () => {
  const { RegistrationModeControl } =
    await import('../src/features/registration/mode-control');
  const saved: string[] = [];
  render(
    <RegistrationModeControl
      mode="invitation-only"
      canEdit
      onSave={async (mode) => {
        saved.push(mode);
        throw new Error('Settings could not be saved');
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Registration mode'), {
    target: { value: 'open' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save registration mode' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Settings could not be saved',
  );
  expect(saved).toEqual(['open']);
});
