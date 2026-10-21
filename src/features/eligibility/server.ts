import { SYSTEM_ROLES } from '~/features/authz/schema';
import { hasCompletedOnboarding } from '~/features/users/onboarding';
import { db } from '~/server/db';
import {
  certificationsInAuthz as certifications,
  userCertificationsInAuthz as links,
  positionsInCalendar as positions,
  userInBetterAuth as users,
} from '~/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { evaluateRequirements } from './evaluate';

export async function evaluatePositionEligibility(input: {
  positionId: string;
  userId: string;
  allowInvited: boolean;
}) {
  const [position] = await db
    .select()
    .from(positions)
    .where(
      and(eq(positions.id, input.positionId), isNull(positions.deletedAt)),
    );
  if (!position) throw new Error('Position not found');
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId));
  if (!user) throw new Error('Profile not found');
  const [catalog, verified] = await Promise.all([
    db.select().from(certifications),
    db
      .select({ id: links.certificationId })
      .from(links)
      .where(
        and(
          eq(links.userId, user.id),
          eq(links.status, 'verified'),
          isNull(links.deletedAt),
        ),
      ),
  ]);
  const assignable =
    !user.deletedAt &&
    SYSTEM_ROLES.includes(user.role as (typeof SYSTEM_ROLES)[number]) &&
    ((user.status === 'active' && hasCompletedOnboarding(user)) ||
      (input.allowInvited && user.status === 'invited'));
  const explanation = evaluateRequirements(position.eligibilityExpression, {
    role: user.role,
    certifications: catalog,
    verifiedCertificationIds: verified.map((c) => c.id),
  });
  const requirementsMet = explanation?.met ?? true;
  return {
    assignable,
    requirementsMet,
    eligible: assignable && requirementsMet,
    explanation,
    reason: assignable
      ? null
      : 'Profile must be active with completed onboarding; schedulers may assign invited profiles.',
  };
}
