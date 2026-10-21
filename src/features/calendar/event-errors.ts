export function throwEventError(error: unknown): never {
  const message =
    error instanceof Error
      ? error.cause instanceof Error
        ? error.cause.message
        : error.message
      : '';
  if (message.includes('event_local_window'))
    throw new Error(
      'Event end must be later than start on the same America/New_York date',
    );
  throw error;
}
