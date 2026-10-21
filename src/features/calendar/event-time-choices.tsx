import { useId } from 'react';
import { eventLocalInstants, formatEventTime } from './event-time';

export type TimeOccurrence = 'earlier' | 'later';
export function EventTimeChoices({
  date,
  timeBegin,
  timeEnd,
  beginOccurrence,
  endOccurrence,
  onBeginChange,
  onEndChange,
}: {
  date: string;
  timeBegin: string;
  timeEnd: string | null;
  beginOccurrence: TimeOccurrence;
  endOccurrence: TimeOccurrence;
  onBeginChange: (value: TimeOccurrence) => void;
  onEndChange: (value: TimeOccurrence) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p className="text-sm">
        All event dates and times use America/New_York. Start and end must be on
        the same date; end time is required.
      </p>
      {[
        {
          label: 'Start',
          time: timeBegin,
          value: beginOccurrence,
          onChange: onBeginChange,
        },
        {
          label: 'End',
          time: timeEnd ?? '',
          value: endOccurrence,
          onChange: onEndChange,
        },
      ].map((field) => {
        if (!date || !field.time) return null;
        const candidates = eventLocalInstants(date, field.time);
        if (!candidates.length)
          return (
            <p key={field.label} role="alert">
              {field.label} time does not exist on this date in
              America/New_York. Choose another time.
            </p>
          );
        if (candidates.length < 2) return null;
        return (
          <div key={field.label}>
            <label htmlFor={`${id}-${field.label}`}>
              {field.label} time occurrence
            </label>{' '}
            <select
              id={`${id}-${field.label}`}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value as TimeOccurrence)}
            >
              <option value="earlier">
                First occurrence (
                {formatEventTime(candidates[0]).split(' ').at(-1)})
              </option>
              <option value="later">
                Second occurrence (
                {formatEventTime(candidates[1]).split(' ').at(-1)})
              </option>
            </select>
          </div>
        );
      })}
    </div>
  );
}
