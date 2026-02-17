import type { CommonFieldProps } from '~/components/form';
import { useFieldContext } from '~/components/form';
import {
  DatePicker,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '~/components/ui';

// TODO: Implement focus input when label clicked.
type DateFieldProps = CommonFieldProps & {
  format?: string;
};
export function DateField({
  description,
  format,
  label,
  placeholder,
}: DateFieldProps) {
  const field = useFieldContext<string | null>();
  const { errors } = field.state.meta;

  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <DatePicker
        format={format ?? 'YYYY-MM-DD'}
        placeholder={placeholder}
        value={field.state.value}
        onSelect={(date) => (date ? field.handleChange(date) : null)}
      />
      {errors.length > 0 ? (
        <FieldError errors={field.state.meta.errors} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
