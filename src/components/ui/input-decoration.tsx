import { cn } from '~/lib/utils';
import type { ReactNode } from 'react';

type InputDecorationProps = { children: ReactNode; prefix?: boolean };
/**
Renders a prefix or suffix to an input. By default, a suffix is rendered. Pass `prefix` to render a prefix instead.
 */
export function InputDecoration({ children }: InputDecorationProps) {
  return children ? (
    <span
      className={cn(
        'pointer-events-none flex h-full items-center [&_svg]:size-4 [&_svg]:stroke-2',
      )}
    >
      {children}
    </span>
  ) : null;
}
