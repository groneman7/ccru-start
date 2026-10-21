import { db } from '~/server/db';
import {
  certificationsInAuthz as certifications,
  userCertificationsInAuthz as links,
  userInBetterAuth as users,
} from '~/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export async function listUserCertifications(userId: string) {
  return db
    .select({
      id: links.id,
      userId: links.userId,
      certificationId: links.certificationId,
      display: certifications.display,
      status: links.status,
      version: links.version,
    })
    .from(links)
    .innerJoin(certifications, eq(links.certificationId, certifications.id))
    .innerJoin(users, eq(users.id, links.userId))
    .where(
      and(
        eq(links.userId, userId),
        isNull(users.deletedAt),
        isNull(links.deletedAt),
        isNull(certifications.deletedAt),
      ),
    );
}
export async function getUserCertification(id: string) {
  const [record] = await db
    .select()
    .from(links)
    .where(and(eq(links.id, id), isNull(links.deletedAt)));
  if (!record) throw new Error('User certification not found');
  return record;
}
export async function writeUserCertification(input: {
  actorId: string;
  userId: string | null;
  id?: string;
  certificationId?: string;
  action:
    'submit' | 'create-verified' | 'edit' | 'withdraw' | 'approve' | 'reject';
  version?: number;
  comment?: string;
}) {
  try {
    const result = await db.execute<{ id: string }>(
      sql`SELECT authz.write_user_certification(${input.actorId}::uuid,${input.userId}::uuid,${input.id ?? null}::uuid,${input.certificationId ?? null}::uuid,${input.action},${input.version ?? null}::integer,${input.comment ?? null}) AS id`,
    );
    return { id: result.rows[0].id };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.cause instanceof Error
          ? error.cause.message
          : error.message
        : '';
    for (const expected of [
      'Certification is deleted or does not exist',
      'Profile is deleted or does not exist',
      'Submission changed; refresh before trying again',
      'User certification not found',
      'Certification cannot be changed in its current state',
    ])
      if (message.includes(expected)) throw new Error(expected);
    if (message.includes('user_certification_live_unique'))
      throw new Error('This profile already has this certification');
    throw error;
  }
}
