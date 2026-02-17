import { withFieldGroup } from '~/components/form';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '~/components/ui';

export const NameFieldGroup = withFieldGroup<
  { nameFirst: string; nameMiddle: string; nameLast: string },
  unknown,
  {}
>({
  render: ({ group }) => {
    return (
      <FieldSet>
        <FieldLegend>Name</FieldLegend>
        <FieldGroup className="px-2" orientation="horizontal">
          <group.AppField name="nameFirst">
            {(nameFirstField) => (
              <Field>
                <FieldLabel htmlFor={nameFirstField.name}>First</FieldLabel>
                <nameFirstField.InputField />
              </Field>
            )}
          </group.AppField>
          <group.AppField name="nameMiddle">
            {(nameMiddleField) => (
              <Field>
                <FieldLabel htmlFor={nameMiddleField.name}>Middle</FieldLabel>
                <nameMiddleField.InputField />
              </Field>
            )}
          </group.AppField>
          <group.AppField name="nameLast">
            {(nameLastField) => (
              <Field>
                <FieldLabel htmlFor={nameLastField.name}>Last</FieldLabel>
                <nameLastField.InputField />
              </Field>
            )}
          </group.AppField>
        </FieldGroup>
      </FieldSet>
    );
  },
});
