export function throwPositionError(error: unknown): never {
  const message =
    error instanceof Error
      ? error.cause instanceof Error
        ? error.cause.message
        : error.message
      : '';
  for (const expected of [
    'Requirement certification is deleted or does not exist',
    'Position changes require Read Committed isolation',
  ])
    if (message.includes(expected)) throw new Error(expected);
  if (message.includes('positions_name_key'))
    throw new Error('A position with this name already exists');
  throw error;
}
