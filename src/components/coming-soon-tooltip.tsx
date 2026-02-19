import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui';
import type { ReactElement } from 'react';

export function ComingSoonTooltip({ children }: { children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="cursor-not-allowed! **:cursor-not-allowed!"
        render={children}
      />
      <TooltipContent sideOffset={8}>
        This feature isn't available yet, but I am actively working on it.
        Please check back soon!
      </TooltipContent>
    </Tooltip>
  );
}
