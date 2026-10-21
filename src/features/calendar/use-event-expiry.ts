import { useEffect, useState } from 'react';

// Hide a loaded event at its end even if the visitor keeps the page open.
// Server reads independently enforce the same boundary and prohibit caching.
export function useEventExpiry(ends: string[]) {
  const [now, setNow] = useState(() => Date.now());
  const next = ends
    .map(Date.parse)
    .filter((end) => end > now)
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    if (next === undefined) return;
    const timeout = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(next - Date.now(), 0), 2147483647),
    );
    return () => clearTimeout(timeout);
  }, [next, now]);
  return now;
}
