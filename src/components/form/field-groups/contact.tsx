import { withFieldGroup } from '~/components/form';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '~/components/ui';

export const ContactFieldGroup = withFieldGroup<
  {
    email: string;
    phoneNumber: string;
  },
  unknown,
  {}
>({
  render: ({ group }) => {
    return (
      <FieldSet>
        <FieldLegend>Contact</FieldLegend>
        <FieldGroup>
          <group.AppField name="email">
            {(emailField) => (
              <Field>
                <FieldLabel htmlFor={emailField.name}>Email</FieldLabel>
                <emailField.InputField />
              </Field>
            )}
          </group.AppField>
          <group.AppField name="phoneNumber">
            {(phoneNumberField) => (
              <Field>
                <FieldLabel htmlFor={phoneNumberField.name}>Phone</FieldLabel>
                <phoneNumberField.InputField />
              </Field>
            )}
          </group.AppField>
        </FieldGroup>
      </FieldSet>
    );
  },
});
