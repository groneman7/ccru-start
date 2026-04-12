import { withFieldGroup } from '~/components/form';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
} from '~/components/ui';
import { createEmptyLocation } from '~/features/calendar/location';

export const AddressFieldGroup = withFieldGroup<
  {
    location: {
      name: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      zip: string;
    };
  },
  unknown,
  {}
>({
  render: ({ group }) => {
    return (
      <FieldSet>
        <FieldLegend>Location</FieldLegend>
        <group.Field name="location">
          {(locationField) =>
            (() => {
              const location =
                locationField.state.value ?? createEmptyLocation();
              const updateLocation = (
                key: keyof typeof location,
                nextValue: string | null,
              ) => {
                locationField.handleChange({
                  ...location,
                  [key]: nextValue,
                });
              };

              return (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${locationField.name}.name`}>
                      Venue name
                    </FieldLabel>
                    <Input
                      id={`${locationField.name}.name`}
                      name={`${locationField.name}.name`}
                      value={location.name}
                      onBlur={locationField.handleBlur}
                      onChange={(e) => updateLocation('name', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${locationField.name}.line1`}>
                      Address line 1
                    </FieldLabel>
                    <Input
                      id={`${locationField.name}.line1`}
                      name={`${locationField.name}.line1`}
                      value={location.line1}
                      onBlur={locationField.handleBlur}
                      onChange={(e) => updateLocation('line1', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${locationField.name}.line2`}>
                      Address line 2
                    </FieldLabel>
                    <Input
                      id={`${locationField.name}.line2`}
                      name={`${locationField.name}.line2`}
                      value={location.line2 ?? ''}
                      onBlur={locationField.handleBlur}
                      onChange={(e) =>
                        updateLocation('line2', e.target.value || null)
                      }
                    />
                  </Field>
                  <FieldGroup orientation="horizontal">
                    <Field>
                      <FieldLabel htmlFor={`${locationField.name}.city`}>
                        City
                      </FieldLabel>
                      <Input
                        id={`${locationField.name}.city`}
                        name={`${locationField.name}.city`}
                        value={location.city}
                        onBlur={locationField.handleBlur}
                        onChange={(e) => updateLocation('city', e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${locationField.name}.state`}>
                        State
                      </FieldLabel>
                      <Input
                        id={`${locationField.name}.state`}
                        name={`${locationField.name}.state`}
                        value={location.state}
                        onBlur={locationField.handleBlur}
                        onChange={(e) =>
                          updateLocation('state', e.target.value)
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${locationField.name}.zip`}>
                        ZIP
                      </FieldLabel>
                      <Input
                        id={`${locationField.name}.zip`}
                        name={`${locationField.name}.zip`}
                        value={location.zip}
                        onBlur={locationField.handleBlur}
                        onChange={(e) => updateLocation('zip', e.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                </FieldGroup>
              );
            })()
          }
        </group.Field>
      </FieldSet>
    );
  },
});
