/** Display names contain name components; qualifications remain a separate field. */
export function profileDisplayName(profile: {
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
}) {
  return [profile.nameFirst, profile.nameMiddle, profile.nameLast]
    .filter(Boolean)
    .join(' ');
}
