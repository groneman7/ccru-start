import { IconCheck } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import {
  Button,
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  FieldGroup,
  FieldLabel,
  useComboboxAnchor,
} from '~/components/ui';
import {
  completeOnboardingMutation,
  updateOnboardingProfileMutation,
} from '~/features/users/mutations';
import { authClient } from '~/lib/auth-client';
import { getChangedFields } from '~/lib/utils';
import { useState } from 'react';

const POST_NOMINALS = ['MD', 'DO', 'PA-C', 'APRN', 'RN', 'PharmD', 'PhD'];

export function OnboardingDialog() {
  const { currentUser } = useRouteContext({ from: '/_authed' });
  const nav = useNavigate();

  const anchor = useComboboxAnchor();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);

  async function resendVerification() {
    setSendingVerification(true);
    setError(null);
    try {
      const result = await authClient.sendVerificationEmail({
        email: currentUser.email,
        callbackURL: '/',
      });
      if (result.error) throw new Error(result.error.message);
      setNotice(
        'Verification email requested. Check your inbox and spam folder.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to request verification email.',
      );
    } finally {
      setSendingVerification(false);
    }
  }

  const form = useAppForm({
    defaultValues: {
      nameFirst: currentUser.nameFirst,
      nameMiddle: currentUser.nameMiddle ?? '',
      nameLast: currentUser.nameLast,
      postNominals: currentUser.postNominals?.split(', ') ?? ([] as string[]),
      email: currentUser.email,
      phoneNumber: currentUser.phoneNumber ?? '',
      image: currentUser.image ?? '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setNotice(null);
      try {
        const {
          nameFirst,
          nameMiddle,
          nameLast,
          postNominals,
          email,
          phoneNumber,
        } = value;
        const postNominalsString = postNominals.join(', ');
        const display = `${nameFirst.trim()} ${nameLast.trim()}${postNominals.length > 0 ? `, ${postNominalsString}` : ''}`;

        const nextProfile = {
          display,
          email,
          nameFirst,
          nameMiddle,
          nameLast,
          phoneNumber,
          postNominals: postNominalsString,
        };
        const currentProfile = {
          display: currentUser.display,
          email: currentUser.email,
          nameFirst: currentUser.nameFirst,
          nameMiddle: currentUser.nameMiddle,
          nameLast: currentUser.nameLast,
          phoneNumber: currentUser.phoneNumber,
          postNominals: currentUser.postNominals,
        };
        const changedFields = getChangedFields(nextProfile, currentProfile);

        if (Object.keys(changedFields).length > 0) {
          await updateOnboardingProfile({
            userId: currentUser.id,
            ...changedFields,
          });
        }

        // The verification link may have been opened in another tab.
        const session = await authClient.getSession({
          query: { disableCookieCache: true },
        });
        if (session.error) throw new Error(session.error.message);
        if (!session.data?.user.emailVerified) {
          setNotice(
            'Profile saved. Verify your email, then click Save again to finish.',
          );
          return;
        }
        await completeOnboarding({ userId: currentUser.id });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to save your profile.',
        );
      }
    },
  });

  const { mutateAsync: updateOnboardingProfile } = useMutation({
    ...updateOnboardingProfileMutation(),
  });

  const { mutateAsync: completeOnboarding } = useMutation({
    ...completeOnboardingMutation(),
    onSuccess: () => {
      nav({ reloadDocument: true });
    },
  });

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-3xl">Welcome to CCRU</DialogTitle>
          <DialogDescription>Let's finish your profile.</DialogDescription>
        </DialogHeader>
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <div className="flex gap-4">
              <div className="flex h-40 w-56 items-center justify-center border">
                img
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <FieldGroup>
                  <FieldGroup orientation="horizontal">
                    <form.AppField name="nameFirst">
                      {(nameFirstField) => (
                        <nameFirstField.InputField
                          label="First name"
                          required
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="nameMiddle">
                      {(nameMiddleField) => (
                        <nameMiddleField.InputField label="Middle name (or initial)" />
                      )}
                    </form.AppField>
                  </FieldGroup>
                  <FieldGroup orientation="horizontal">
                    <form.AppField name="nameLast">
                      {(nameLastField) => (
                        <nameLastField.InputField label="Last name" required />
                      )}
                    </form.AppField>
                    <form.AppField name="postNominals">
                      {(postNominalsField) => (
                        <div className="w-40">
                          <Field>
                            <FieldLabel htmlFor={postNominalsField.name}>
                              Post-nominals
                            </FieldLabel>
                            <Combobox
                              // defaultValue={postNominalsField.state.value}
                              items={POST_NOMINALS}
                              multiple
                              value={postNominalsField.state.value}
                              onValueChange={(item) =>
                                postNominalsField.handleChange(item)
                              }
                            >
                              <ComboboxChips ref={anchor}>
                                <ComboboxValue>
                                  <>
                                    {postNominalsField.state.value.map(
                                      (item) => (
                                        <ComboboxChip key={item}>
                                          {item}
                                        </ComboboxChip>
                                      ),
                                    )}
                                    <ComboboxChipsInput />
                                  </>
                                </ComboboxValue>
                              </ComboboxChips>
                              <ComboboxContent>
                                <ComboboxEmpty>Empty.</ComboboxEmpty>
                                <ComboboxList>
                                  {(item) => (
                                    <ComboboxItem key={item} value={item}>
                                      {item}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          </Field>
                        </div>
                      )}
                    </form.AppField>
                  </FieldGroup>
                </FieldGroup>
                <form.AppField name="email">
                  {(field) => (
                    <field.InputField label="Email" type="email" readOnly />
                  )}
                </form.AppField>
                {!currentUser.emailVerified && (
                  <div className="grid gap-2">
                    <p>
                      Verify your email using the link in your inbox before
                      finishing your profile.
                    </p>
                    <Button
                      type="button"
                      disabled={sendingVerification}
                      onClick={resendVerification}
                    >
                      {sendingVerification
                        ? 'Sending…'
                        : 'Resend verification email'}
                    </Button>
                  </div>
                )}
                <form.AppField name="phoneNumber">
                  {(field) => (
                    <field.InputField
                      label="Phone (with country code)"
                      type="tel"
                      required
                    />
                  )}
                </form.AppField>
                {error && <p role="alert">{error}</p>}
                {notice && <p role="status">{notice}</p>}
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button
                      type="submit"
                      variant="solid"
                      disabled={isSubmitting}
                    >
                      <IconCheck />
                      {isSubmitting ? 'Saving…' : 'Save'}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
