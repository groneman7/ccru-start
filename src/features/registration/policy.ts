import { db } from '~/server/db';
import { organizationSettings } from '~/server/db/schema';

export const CONTACT_ORGANIZATION =
  'Contact the organization to request an invitation.';
export async function registrationMode() {
  const [settings] = await db.select().from(organizationSettings);
  return settings?.registrationMode === 'open' ? 'open' : 'invitation-only';
}
