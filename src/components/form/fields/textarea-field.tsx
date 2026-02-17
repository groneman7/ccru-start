import type { CommonFieldProps } from '~/components/form';
import { useFieldContext } from '~/components/form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Textarea,
} from '~/components/ui';

type TextareaFieldProps = CommonFieldProps;
export function TextareaField({
  description,
  label,
  placeholder,
}: TextareaFieldProps) {
  const field = useFieldContext<string>();
  const { errors } = field.state.meta;

  return (
    <Field>
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
      <Textarea
        id={field.name}
        placeholder={placeholder}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {errors.length > 0 ? (
        <FieldError errors={field.state.meta.errors} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
