import { withFieldGroup } from '~/components/form';
import type { ComponentProps } from 'react';
import { EventTimeChoices } from './event-time-choices';

type ChoiceProps = Pick<
  ComponentProps<typeof EventTimeChoices>,
  'beginOccurrence' | 'endOccurrence' | 'onBeginChange' | 'onEndChange'
>;
export const EventTimeChoiceFieldGroup = withFieldGroup<
  { date: string; timeBegin: string; timeEnd: string | null },
  unknown,
  ChoiceProps
>({
  render: ({ group, ...choices }) => (
    <group.Subscribe selector={(state) => state.values}>
      {(values) => <EventTimeChoices {...values} {...choices} />}
    </group.Subscribe>
  ),
});
