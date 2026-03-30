import { IconCheck } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import { ContactFieldGroup } from '~/components/form/field-groups/contact';
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
import { getChangedFields } from '~/lib/utils';

// import { z } from 'zod';

const POST_NOMINALS = ['MD', 'DO', 'PA-C', 'APRN', 'RN', 'PharmD', 'PhD'];
// const onboardingSubmitSchema = z.object({
//   nameFirst: z.preprocess(
//     (value) => (typeof value === 'string' ? value.trim() : ''),
//     z.string().min(1),
//   ),
//   nameMiddle: z.preprocess((value) => {
//     if (typeof value !== 'string') return null;
//     const trimmed = value.trim();
//     return trimmed.length === 0 ? null : trimmed;
//   }, z.string().nullable()),
//   nameLast: z.preprocess(
//     (value) => (typeof value === 'string' ? value.trim() : ''),
//     z.string().min(1),
//   ),
//   postNominals: z.preprocess((value) => {
//     if (!Array.isArray(value)) return [];
//     return value
//       .filter((item): item is string => typeof item === 'string')
//       .map((item) => item.trim())
//       .filter((item) => item.length > 0);
//   }, z.array(z.string())),
//   email: z.preprocess(
//     (value) => (typeof value === 'string' ? value.trim() : ''),
//     z.string().email(),
//   ),
//   phoneNumber: z.preprocess((value) => {
//     if (typeof value !== 'string') return null;
//     const trimmed = value.trim();
//     return trimmed.length === 0 ? null : trimmed;
//   }, z.string().nullable()),
// });

export function OnboardingDialog() {
  const { currentUser } = useRouteContext({ from: '/_authed' });
  const nav = useNavigate();

  const anchor = useComboboxAnchor();

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
      // const parsed = onboardingSubmitSchema.parse(value);
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

      await completeOnboarding({ userId: currentUser.id });
    },
  });

  const { mutateAsync: updateOnboardingProfile } = useMutation({
    ...updateOnboardingProfileMutation(),
  });

  const { mutateAsync: completeOnboarding } = useMutation({
    ...completeOnboardingMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
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
                        <nameFirstField.InputField label="First name" />
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
                        <nameLastField.InputField label="Last name" />
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
                <ContactFieldGroup
                  form={form}
                  fields={{ email: 'email', phoneNumber: 'phoneNumber' }}
                />
                <Button type="submit" variant="solid">
                  <IconCheck />
                  Save
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
