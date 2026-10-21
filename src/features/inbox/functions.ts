import { createServerFn } from '@tanstack/react-start';
import { db } from '~/server/db';
import {
  certificationsInAuthz as certifications,
  userCertificationsInAuthz as links,
  notificationsInAuthz as notifications,
  notificationRecipientsInAuthz as recipients,
  userInBetterAuth as users,
} from '~/server/db/schema';
import {
  denyPermission,
  requirePermission,
} from '~/server/permissions/require-permission';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { boolean, object, uuidv7, enum as zodEnum } from 'zod';

const listInboxServerFn = createServerFn({ method: 'GET' })
  .validator(object({ history: boolean().default(false) }).strict())
  .handler(async ({ data }) => {
    const { actor, permissions } = await requirePermission('read', 'Inbox');
    return db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        body: notifications.body,
        userCertificationId: links.id,
        userId: links.userId,
        userDisplay: users.display,
        certificationDisplay: certifications.display,
        status: links.status,
        version: links.version,
        readAt: recipients.readAt,
        dismissedAt: recipients.dismissedAt,
        resolvedAt: notifications.resolvedAt,
      })
      .from(notifications)
      .innerJoin(links, eq(links.id, notifications.userCertificationId))
      .innerJoin(certifications, eq(certifications.id, links.certificationId))
      .innerJoin(users, eq(users.id, links.userId))
      .leftJoin(
        recipients,
        and(
          eq(recipients.notificationId, notifications.id),
          eq(recipients.userId, actor.id),
        ),
      )
      .where(
        and(
          isNull(notifications.deletedAt),
          or(
            eq(notifications.recipientId, actor.id),
            permissions.can('review', 'UserCertification')
              ? eq(notifications.audience, 'user-management')
              : undefined,
          ),
          data.history
            ? undefined
            : and(
                isNull(notifications.resolvedAt),
                isNull(recipients.dismissedAt),
              ),
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id));
  });
const setInboxStateServerFn = createServerFn({ method: 'POST' })
  .validator(
    object({
      notificationId: uuidv7(),
      state: zodEnum(['read', 'dismiss']),
    }).strict(),
  )
  .handler(async ({ data }) => {
    const { actor, permissions } = await requirePermission('read', 'Inbox');
    const result = await db.execute<{ id: string }>(sql`
    INSERT INTO authz.notification_recipients (notification_id,user_id,read_at,dismissed_at)
    SELECT id,${actor.id}::uuid,CASE WHEN ${data.state}='read' THEN now() END,CASE WHEN ${data.state}='dismiss' THEN now() END
    FROM authz.notifications WHERE id=${data.notificationId}::uuid AND deleted_at IS NULL
      AND (recipient_id=${actor.id}::uuid OR (audience='user-management' AND ${permissions.can('review', 'UserCertification')}))
    ON CONFLICT (notification_id,user_id) DO UPDATE SET
      read_at=COALESCE(authz.notification_recipients.read_at,EXCLUDED.read_at),
      dismissed_at=COALESCE(authz.notification_recipients.dismissed_at,EXCLUDED.dismissed_at)
    RETURNING notification_id AS id`);
    if (!result.rows[0]) denyPermission();
    return result.rows[0];
  });
export const inboxServerFns = {
  list: listInboxServerFn,
  setState: setInboxStateServerFn,
};
