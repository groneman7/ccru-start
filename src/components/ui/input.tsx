import { InputDecoration } from '~/components/ui/index';
import { cn } from '~/lib/utils/index';
import { cva  } from 'class-variance-authority';
import type {VariantProps} from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

const inputVariants = cva(
  cn(
    'form-control has-focus-ring flex items-center gap-2 px-2',
    // "form-control has-focus-ring flex items-stretch flex-1 px-2 gap-1"
    // "dark:aria-invalid:ring-destructive/40",
    // "file:text-foreground border file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
    // "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    // "aria-invalid:ring-destructive/20 aria-invalid:border-destructive"
  ),
  {
    variants: {
      variant: {
        default: 'border border-border',
      },
      size: {
        sm: 'h-7 text-sm',
        md: 'h-9',
        lg: 'h-11 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export type InputProps = Omit<ComponentProps<'input'>, 'size' | 'prefix'> &
  VariantProps<typeof inputVariants> & {
    prefix?: ReactNode;
    suffix?: ReactNode;
  };
export function Input({
  className,
  id,
  prefix = null,
  size,
  suffix = null,
  type,
  ...props
}: InputProps) {
  return (
    <div className={cn(inputVariants({ size }), className)}>
      <InputDecoration>{prefix}</InputDecoration>
      <input className={cn('h-full w-full')} id={id} type={type} {...props} />
      <InputDecoration>{suffix}</InputDecoration>
    </div>
  );
}
