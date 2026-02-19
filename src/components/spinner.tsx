import { cn } from '~/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';

export function Spinner({ className, ...props }: ComponentProps<'svg'>) {
  return <Loader2 className={cn('animate-spin', className)} {...props} />;
}
