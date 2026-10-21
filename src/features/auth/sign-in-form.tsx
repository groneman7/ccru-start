import { IconCheck } from '@tabler/icons-react';
import { useAppForm } from '~/components/form';
import {
  Button,
  Checkbox,
  Field,
  FieldGroup,
  FieldLabel,
} from '~/components/ui';

type Credentials = { email: string; password: string; staySignedIn: boolean };
export function EmailSignInForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (data: Credentials) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { email: '', password: '', staySignedIn: false },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="grid gap-4"
    >
      <form.AppField name="email">
        {(emailField) => <emailField.InputField label="Email" type="email" />}
      </form.AppField>
      <form.AppField name="password">
        {(passwordField) => (
          <passwordField.InputField label="Password" type="password" />
        )}
      </form.AppField>
      <FieldGroup className="justify-between" orientation="horizontal">
        <form.AppField name="staySignedIn">
          {(staySignedInField) => (
            <Field orientation="horizontal">
              <Checkbox
                id={staySignedInField.name}
                name={staySignedInField.name}
                checked={staySignedInField.state.value}
                onCheckedChange={(checked) =>
                  staySignedInField.handleChange(checked === true)
                }
              />
              <FieldLabel
                className="font-light"
                htmlFor={staySignedInField.name}
              >
                Stay signed in
              </FieldLabel>
            </Field>
          )}
        </form.AppField>
        <Button type="button" size="xs" variant="ghost">
          Forgot password
        </Button>
      </FieldGroup>
      <Button
        className="mt-4"
        disabled={pending}
        type="submit"
        size="lg"
        variant="solid"
      >
        <IconCheck />
        Sign in
      </Button>
    </form>
  );
}
