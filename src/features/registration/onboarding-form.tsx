import { Button, Input } from '~/components/ui';
import { onboardingFieldsSchema } from '~/features/users/onboarding';
import { useState } from 'react';
import type { infer as Infer } from 'zod';

type Fields = Infer<typeof onboardingFieldsSchema>;
type Profile = { [K in keyof Fields]?: string | null | undefined } & {
  email: string;
  emailVerified: boolean;
};
const fields = [
  ['nameFirst', 'First name'],
  ['nameMiddle', 'Middle name'],
  ['nameLast', 'Last name'],
  ['phoneNumber', 'Phone (with country code)'],
  ['postNominals', 'Post-nominals'],
  ['image', 'Photo URL'],
] as const;
export function OnboardingForm({
  profile,
  onSave,
  onResend,
  onSignOut,
}: {
  profile: Profile;
  onSave: (data: Fields) => Promise<string>;
  onResend: () => Promise<unknown>;
  onSignOut: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(
    () =>
      Object.fromEntries(
        fields.map(([key]) => [key, profile[key] ?? '']),
      ) as Record<keyof Fields, string>,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mx-auto grid w-full max-w-lg gap-4 p-6">
      <h1 className="text-3xl font-semibold">Welcome to CCRU</h1>
      <p>Verify your email and finish your profile before using scheduling.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const parsed = onboardingFieldsSchema.safeParse({
              ...draft,
              image: draft.image || null,
            });
            if (!parsed.success)
              throw new Error(
                parsed.error.issues.map((issue) => issue.message).join('. '),
              );
            setNotice(await onSave(parsed.data));
          });
        }}
      >
        <label htmlFor="onboarding-email">
          Email
          <Input
            id="onboarding-email"
            type="email"
            value={profile.email}
            readOnly
          />
        </label>
        <fieldset disabled={pending} className="grid gap-3">
          <legend className="sr-only">
            Required onboarding and optional profile details
          </legend>
          {fields.map(([key, label]) => (
            <label key={key} htmlFor={`onboarding-${key}`}>
              {label}
              <Input
                id={`onboarding-${key}`}
                value={draft[key]}
                type={
                  key === 'phoneNumber'
                    ? 'tel'
                    : key === 'image'
                      ? 'url'
                      : 'text'
                }
                required={['nameFirst', 'nameLast', 'phoneNumber'].includes(
                  key,
                )}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
          <Button type="submit">{pending ? 'Saving…' : 'Save profile'}</Button>
        </fieldset>
      </form>
      {!profile.emailVerified && (
        <Button
          disabled={pending}
          onClick={() =>
            void run(async () => {
              await onResend();
              setNotice(
                'Verification email requested. Check your inbox and spam folder, then save your profile again.',
              );
            })
          }
        >
          Resend verification email
        </Button>
      )}
      <Button
        disabled={pending}
        variant="outline"
        onClick={() => void run(onSignOut)}
      >
        Sign out
      </Button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
