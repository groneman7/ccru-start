import { Spinner } from '~/components';

export function Pending() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner className="size-16 stroke-1" />
    </div>
  );
}
