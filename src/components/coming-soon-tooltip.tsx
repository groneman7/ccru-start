import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui';
import type { ReactNode } from 'react';

export function ComingSoonTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-not-allowed! **:cursor-not-allowed!">
        {children}
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>
        This feature isn't available yet, but I am actively working on it.
        Please check back soon!
      </TooltipContent>
    </Tooltip>
  );
}
