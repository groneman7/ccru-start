import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// A helper function to parse user input for times like "330p" or "3:30 PM".
// Returns an object containing { iso, display } if successfully parsed, or null otherwise.
export function parseAndFormatTime(value: string) {
  const raw = value.trim().toLowerCase();

  // Regex to capture hour, optional minute, and optional am/pm.
  const match = raw.match(/^([0-1]?\d|2[0-3])(?::?(\d{2}))?\s*([ap]m?)?$/);
  if (!match) {
    return null;
  }

  const [, hourStr, minuteStr, ampm] = match;
  if (!hourStr) {
    return null;
  }

  let hour = parseInt(hourStr, 10);
  const minute = minuteStr ? parseInt(minuteStr, 10) : 0;

  // If user typed an am/pm indicator, convert to 24-hr.
  if (ampm) {
    if (ampm.startsWith('p') && hour < 12) {
      hour += 12;
    }
    if (ampm.startsWith('a') && hour === 12) {
      hour = 0;
    }
  }

  if (hour > 23 || minute > 59) {
    return null;
  }

  // Build ISO-like 24-hour time string, e.g. "15:30".
  const iso = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  // Convert to 12-hour for display.
  let displayHour = hour % 12;
  if (displayHour === 0) {
    displayHour = 12;
  }
  const amPmLabel = hour >= 12 ? 'PM' : 'AM';
  const displayMinute = minute.toString().padStart(2, '0');
  const display = `${displayHour}:${displayMinute} ${amPmLabel}`;

  return { iso, display };
}

// Convert a 24-hour "HH:mm" string to a 12-hour time with AM/PM for display.
export function convert24to12(isoTime: string) {
  if (!isoTime) return '';
  const [hourStr, minuteStr] = isoTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  let displayHour = hour % 12;
  if (displayHour === 0) {
    displayHour = 12;
  }
  const amPmLabel = hour >= 12 ? 'PM' : 'AM';
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${amPmLabel}`;
}

// Helper: combine a date + "HH:mm" in local EST -> produce a UTC Date.
export function combineDateAndTimeToUTC(
  localDate: Date,
  hhmm: string,
): Date | undefined {
  if (!hhmm) return undefined;
  const [hourStr, minuteStr] = hhmm.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // interpret localDate, then convert to UTC
  return dayjs(localDate)
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .utc()
    .toDate();
}
