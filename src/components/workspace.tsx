import { cn } from '~/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

// TODO: Prevent `Workspace` from being imported in anything beside `src/routes/__root.tsx`
export function Workspace({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-1 flex-col p-4', className)} {...props}>
      {children}
    </div>
  );
}

type WorkspaceContentProps = ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal';
  toolbar?: ReactNode;
};

export function WorkspaceContent({
  children,
  className,
  orientation = 'vertical',
  toolbar,
  ...props
}: WorkspaceContentProps) {
  return (
    <>
      {toolbar && (
        <div className="mx-4 my-1 flex items-center gap-4">{toolbar}</div>
      )}
      <div
        className={cn(
          'flex flex-1 p-4',
          orientation === 'vertical' && 'flex-col gap-4',
          orientation === 'horizontal' && 'flex-col gap-8 lg:flex-row',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

export function WorkspaceHeader({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-start gap-4 p-2 text-2xl font-bold',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspaceNav({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
