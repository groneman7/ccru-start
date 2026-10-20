export function throwUserTypeError(error: unknown): never {
  const message =
    error instanceof Error
      ? error.cause instanceof Error
        ? error.cause.message
        : error.message
      : '';
  for (const expected of [
    'User type is assigned to a non-deleted profile',
    'User type is deleted or does not exist',
  ]) {
    if (message.includes(expected)) throw new Error(expected);
  }
  if (message.includes('user_types_name_key'))
    throw new Error('A user type with this name already exists');
  throw error;
}
