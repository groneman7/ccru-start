import { subject } from '@casl/ability';
import { createServerFn } from '@tanstack/react-start';
import {
  getUserCertification,
  listUserCertifications,
  writeUserCertification,
} from '~/features/user-certifications/repository';
import {
  changeUserCertificationSchema,
  createUserCertificationSchema,
  removeUserCertificationSchema,
  reviewUserCertificationSchema,
} from '~/features/user-certifications/schema';
import {
  denyPermission,
  requirePermission,
} from '~/server/permissions/require-permission';
import { object, uuidv7 } from 'zod';

const listUserCertificationsServerFn = createServerFn({ method: 'GET' })
  .validator(object({ userId: uuidv7() }).strict())
  .handler(async ({ data }) => {
    await requirePermission(
      'read',
      subject('UserCertification', { userId: data.userId }),
    );
    return listUserCertifications(data.userId);
  });
const createUserCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(createUserCertificationSchema)
  .handler(async ({ data }) => {
    const { actor, permissions } = await requirePermission(
      'submit',
      subject('UserCertification', { userId: data.userId }),
    );
    return writeUserCertification({
      actorId: actor.id,
      userId: data.userId,
      certificationId: data.certificationId,
      action: permissions.can('review', 'UserCertification')
        ? 'create-verified'
        : 'submit',
    });
  });
async function authorizeUserCertification(
  id: string,
  action: 'review' | 'edit' | 'remove',
) {
  const { actor, permissions } = await requirePermission('read', 'Inbox');
  const record = await getUserCertification(id);
  if (
    !permissions.can(
      action,
      subject('UserCertification', {
        userId: record.userId,
        status: record.status,
      }),
    )
  )
    denyPermission();
  return { actor, record };
}

const reviewUserCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(reviewUserCertificationSchema)
  .handler(async ({ data }) => {
    const { actor, record } = await authorizeUserCertification(
      data.id,
      'review',
    );
    return writeUserCertification({
      actorId: actor.id,
      userId: record.userId,
      id: data.id,
      version: data.version,
      action: data.decision,
      comment: data.comment,
    });
  });
const editUserCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(changeUserCertificationSchema)
  .handler(async ({ data }) => {
    const { actor, record } = await authorizeUserCertification(data.id, 'edit');
    return writeUserCertification({
      actorId: actor.id,
      userId: record.userId,
      id: data.id,
      version: data.version,
      certificationId: data.certificationId,
      action: 'edit',
    });
  });
const removeUserCertificationServerFn = createServerFn({ method: 'POST' })
  .validator(removeUserCertificationSchema)
  .handler(async ({ data }) => {
    const { actor, record } = await authorizeUserCertification(
      data.id,
      'remove',
    );
    return writeUserCertification({
      actorId: actor.id,
      userId: record.userId,
      id: data.id,
      version: data.version,
      action: 'withdraw',
    });
  });
export const userCertificationServerFns = {
  list: listUserCertificationsServerFn,
  edit: editUserCertificationServerFn,
  remove: removeUserCertificationServerFn,
  review: reviewUserCertificationServerFn,
  create: createUserCertificationServerFn,
};
