import { IconLoader2 } from '@tabler/icons-react';
import { cn } from '~/lib/utils';
import type { ComponentProps } from 'react';

export function Spinner({ className, ...props }: ComponentProps<'svg'>) {
  return <IconLoader2 className={cn('animate-spin', className)} {...props} />;
}
