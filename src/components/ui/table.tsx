import { cn } from '~/lib/utils/index';
import type { ComponentProps } from 'react';

function Table({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-container"
      className={cn('border-4 border-red-300', 'overflow-x-auto')}
    >
      <div
        data-slot="table"
        className={cn('w-fit text-sm', className)}
        {...props}
      />
    </div>
  );
}

/**
 * TableHeader - thead
 *
 */
function TableHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-header"
      className={cn('w-full border-4 border-blue-300', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-body"
      className={cn('border-4 border-green-300', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-footer"
      className={cn(
        'border-4 border-yellow-700',
        // "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-row"
      className={cn(
        'flex w-fit border-3 border-purple-500',
        // "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

/**
 * TableHead - Table header cell
 *
 * @returns
 */
function TableHead({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-head"
      className={cn(
        'w-full border-3 border-pink-300',
        // "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-cell"
      className={cn(
        'border-4 border-black',
        // "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
