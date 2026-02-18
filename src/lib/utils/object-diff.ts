export function getChangedFields<T extends Record<string, unknown>>(
  next: T,
  current: T,
): Partial<T> {
  const changed: Partial<T> = {};

  (Object.keys(next) as Array<keyof T>).forEach((key) => {
    if (next[key] !== current[key]) {
      changed[key] = next[key];
    }
  });

  return changed;
}
