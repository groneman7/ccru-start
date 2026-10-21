export function throwCertificationError(error: unknown): never {
  const message =
    error instanceof Error
      ? error.cause instanceof Error
        ? error.cause.message
        : error.message
      : '';
  for (const expected of [
    'Certification has non-deleted children',
    'Parent certification is deleted or does not exist',
    'Certification hierarchy cannot contain a cycle',
  ]) {
    if (message.includes(expected)) throw new Error(expected);
  }
  if (message.includes('certifications_name_key'))
    throw new Error('A certification with this name already exists');
  throw error;
}
