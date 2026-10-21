import { formatEventDate, formatEventTime } from './event-time';
import type { publicEventServerFns } from './functions';
import { useEventExpiry } from './use-event-expiry';

export type PublicEvent = Awaited<
  ReturnType<typeof publicEventServerFns.list>
>[number];
export function PublicEventDetails({ event }: { event: PublicEvent }) {
  const now = useEventExpiry([event.timeEnd]);
  if (Date.parse(event.timeEnd) <= now)
    return <p>This event is not available.</p>;
  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-semibold">{event.name}</h1>
      <p>{formatEventDate(event.timeBegin)}</p>
      <p>
        {formatEventTime(event.timeBegin)} – {formatEventTime(event.timeEnd)}
      </p>
      {event.location && (
        <div>
          <p>{event.location.name}</p>
          <p>
            {[
              event.location.line1,
              event.location.line2,
              event.location.city,
              event.location.state,
              event.location.zip,
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      )}
      {event.description && (
        <p className="whitespace-pre-wrap">{event.description}</p>
      )}
    </article>
  );
}
