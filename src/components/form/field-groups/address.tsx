import { withFieldGroup } from '~/components/form';
import { Field, FieldLabel, Input } from '~/components/ui';

export const AddressFieldGroup = withFieldGroup<
  { location: string | null },
  unknown,
  {}
>({
  render: ({ group }) => {
    return (
      <>
        <group.Field name="location">
          {(locationField) => (
            <Field>
              <FieldLabel htmlFor={locationField.name}>Location</FieldLabel>
              <Input
                id={locationField.name}
                name={locationField.name}
                value={locationField.state.value ?? ''}
                onBlur={locationField.handleBlur}
                onChange={(e) => locationField.handleChange(e.target.value)}
              />
            </Field>
          )}
        </group.Field>
      </>
    );
  },
});
