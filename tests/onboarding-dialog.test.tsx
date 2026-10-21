// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { OnboardingDialog } from '../src/components/onboarding-dialog';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  update: vi.fn(),
  complete: vi.fn(),
  getSession: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useRouteContext: () => ({
    currentUser: {
      id: 'new-user',
      display: 'New Volunteer',
      nameFirst: 'New',
      nameLast: 'Volunteer',
      email: 'new@example.invalid',
      emailVerified: false,
      phoneNumber: '+15550100100',
    },
  }),
}));
vi.mock('~/features/users/mutations', () => ({
  updateOnboardingProfileMutation: () => ({ mutationFn: mocks.update }),
  completeOnboardingMutation: () => ({ mutationFn: mocks.complete }),
}));
vi.mock('~/lib/auth-client', () => ({
  authClient: {
    getSession: mocks.getSession,
    sendVerificationEmail: mocks.sendVerificationEmail,
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({
    data: { user: { emailVerified: false } },
  });
  mocks.sendVerificationEmail.mockResolvedValue({ data: { status: true } });
});
afterEach(cleanup);
function showDialog() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <OnboardingDialog />
    </QueryClientProvider>,
  );
}

test('unverified users can save their details and see how to finish verification', async () => {
  showDialog();
  expect((screen.getByLabelText('Email') as HTMLInputElement).readOnly).toBe(
    true,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect((await screen.findByRole('status')).textContent).toContain(
    'Profile saved. Verify your email',
  );
  expect(mocks.update).toHaveBeenCalled();
  expect(mocks.complete).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});

test('resend requests verification for the registered email', async () => {
  showDialog();
  fireEvent.click(
    screen.getByRole('button', { name: 'Resend verification email' }),
  );
  await screen.findByRole('status');
  expect(mocks.sendVerificationEmail).toHaveBeenCalledWith({
    email: 'new@example.invalid',
    callbackURL: '/',
  });
});

test('verification in another tab allows completing onboarding on the next save', async () => {
  mocks.getSession.mockResolvedValue({
    data: { user: { emailVerified: true } },
  });
  showDialog();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({ reloadDocument: true }),
  );
  expect(mocks.complete).toHaveBeenCalledWith(
    { userId: 'new-user' },
    expect.anything(),
  );
});

test('profile save failures are displayed and do not complete onboarding', async () => {
  mocks.update.mockRejectedValue(new Error('Unable to save profile'));
  showDialog();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Unable to save profile',
  );
  expect(mocks.complete).not.toHaveBeenCalled();
});
