import { useFieldContext } from '~/components/form';
import type { CommonFieldProps } from '~/components/form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  TimePicker,
} from '~/components/ui';

type TimeFieldProps = CommonFieldProps;
export function TimeField({ description, label, placeholder }: TimeFieldProps) {
  const field = useFieldContext<string>();
  const { errors } = field.state.meta;

  return (
    <Field>
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
      <TimePicker
        id={field.name}
        placeholder={placeholder}
        value={field.state.value}
        onChange={(time) => field.handleChange(time)}
      />
      {errors.length > 0 ? (
        <FieldError errors={field.state.meta.errors} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
