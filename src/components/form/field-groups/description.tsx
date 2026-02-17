import { withFieldGroup } from '~/components/form';
import { Field, FieldLabel, Textarea } from '~/components/ui';

export const DescriptionFieldGroup = withFieldGroup<
  { description: string | null },
  unknown,
  {}
>({
  render: ({ group }) => {
    return (
      <>
        <group.Field name="description">
          {(descriptionField) => (
            <Field>
              <FieldLabel htmlFor={descriptionField.name}>
                Description
              </FieldLabel>
              <Textarea
                id={descriptionField.name}
                name={descriptionField.name}
                value={descriptionField.state.value ?? ''}
                onBlur={descriptionField.handleBlur}
                onChange={(e) => descriptionField.handleChange(e.target.value)}
              />
            </Field>
          )}
        </group.Field>
      </>
    );
  },
});
