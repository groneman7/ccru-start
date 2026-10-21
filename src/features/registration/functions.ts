import { createServerFn } from '@tanstack/react-start';
import { registrationMode } from '~/features/registration/policy';
import { db } from '~/server/db';
import { organizationSettings } from '~/server/db/schema';
import { requirePermission } from '~/server/permissions/require-permission';
import { object, enum as zodEnum } from 'zod';

const getRegistrationModeServerFn = createServerFn({ method: 'GET' }).handler(
  () => registrationMode(),
);
const updateRegistrationModeServerFn = createServerFn({ method: 'POST' })
  .validator(object({ mode: zodEnum(['invitation-only', 'open']) }).strict())
  .handler(async ({ data }) => {
    await requirePermission('update', 'RegistrationMode');
    await db
      .insert(organizationSettings)
      .values({ id: 1, registrationMode: data.mode })
      .onConflictDoUpdate({
        target: organizationSettings.id,
        set: { registrationMode: data.mode },
      });
    return { mode: data.mode };
  });
export const registrationServerFns = {
  getMode: getRegistrationModeServerFn,
  updateMode: updateRegistrationModeServerFn,
};
