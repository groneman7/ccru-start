export const EVENT_TIME_ZONE = 'America/New_York';
const localParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export function eventLocalFields(instant: string | number) {
  const date = new Date(instant);
  const parts = Object.fromEntries(
    localParts.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}${date.getUTCMilliseconds() ? '.' + String(date.getUTCMilliseconds()).padStart(3, '0') : ''}`,
  };
}
export function eventLocalInstants(date: string, time: string): string[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(time)
  )
    return [];
  const normalized = `${date}T${time.length === 5 ? time + ':00' : time}`;
  const wall = Date.parse(normalized + 'Z');
  if (!Number.isFinite(wall)) return [];
  const offsets = new Set<number>();
  for (const hours of [-24, 0, 24]) {
    const sample = wall + hours * 3600000;
    const fields = eventLocalFields(sample);
    offsets.add(Date.parse(`${fields.date}T${fields.time}Z`) - sample);
  }
  return [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => {
      const fields = eventLocalFields(instant);
      return (
        Date.parse(`${fields.date}T${fields.time}Z`) === wall &&
        fields.date === date
      );
    })
    .sort((a, b) => a - b)
    .map((instant) => new Date(instant).toISOString());
}
export function eventLocalToInstant(
  date: string,
  time: string,
  occurrence: 'earlier' | 'later' = 'earlier',
) {
  const candidates = eventLocalInstants(date, time);
  if (!candidates.length)
    throw new Error(
      'Choose a valid date and time in America/New_York. This time may not exist during the spring clock change.',
    );
  return occurrence === 'earlier'
    ? candidates[0]
    : candidates[candidates.length - 1];
}
export function validEventWindow(begin: string, end: string) {
  return (
    Number.isFinite(Date.parse(begin)) &&
    Number.isFinite(Date.parse(end)) &&
    Date.parse(end) > Date.parse(begin) &&
    eventLocalFields(begin).date === eventLocalFields(end).date
  );
}
export function eventPhase(begin: string, end: string, now = Date.now()) {
  return now < Date.parse(begin)
    ? 'upcoming'
    : now < Date.parse(end)
      ? 'in-progress'
      : 'past';
}
export function formatEventDate(instant: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(instant));
}
export function formatEventTime(instant: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(instant));
}

export function eventTimeOccurrence(instant: string): 'earlier' | 'later' {
  const fields = eventLocalFields(instant);
  const candidates = eventLocalInstants(fields.date, fields.time);
  return candidates.length > 1 &&
    Date.parse(candidates[1]) === Date.parse(instant)
    ? 'later'
    : 'earlier';
}
