import type { CommonFieldProps } from '~/components/form';
import { useFieldContext } from '~/components/form';
import type { InputProps } from '~/components/ui';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from '~/components/ui';

type InputFieldProps = CommonFieldProps;
export function InputField({
  description,
  label,
  ...props
}: InputFieldProps & InputProps) {
  const field = useFieldContext<string>();
  const { errors } = field.state.meta;

  return (
    <Field>
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
      <Input
        className="border-blue-4500 border"
        id={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        {...props}
      />
      {errors.length > 0 ? (
        <FieldError errors={field.state.meta.errors} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
