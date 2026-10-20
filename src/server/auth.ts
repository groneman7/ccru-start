import type { userTypeSchema } from '~/features/authz/schema';
import { db } from '~/server/db';
import {
  accountInBetterAuth,
  sessionInBetterAuth,
  userInBetterAuth,
  verificationInBetterAuth,
} from '~/server/db/schema';
import { getUserPermissions } from '~/server/permissions';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin /* , phoneNumber */ } from 'better-auth/plugins';
import { defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { config } from 'dotenv';
import type { infer as Infer } from 'zod';

config({ path: '.env.local' });

export const auth = betterAuth({
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const path = ctx.path ?? '';
      if (path === '/update-user' || path === '/sign-up/email') {
        const protectedFields = [
          'role',
          'deletedAt',
          'status',
          'canManageScheduling',
          'canManageUsers',
          'emailVerified',
          'phoneNumberVerified',
          'timestampOnboardingCompleted',
          'timestampFirstLogin',
          'userTypeId',
          'banned',
          'banReason',
          'banExpires',
        ];
        if (protectedFields.some((key) => Object.hasOwn(ctx.body ?? {}, key)))
          throw new APIError('FORBIDDEN', {
            message:
              'Protected profile fields require an authorized domain operation',
          });
      }
      if (!path.startsWith('/admin/')) return;
      const session = await auth.api.getSession({
        headers: ctx.headers ?? new Headers(),
        query: { disableCookieCache: true },
      });
      if (!session) throw new APIError('UNAUTHORIZED');
      const permissions = getUserPermissions(session.user);
      if (
        path === '/admin/stop-impersonating' &&
        session.session.impersonatedBy
      )
        return;
      // Profile reads use the domain operations, which exclude deleted records.
      // The plugin's generic list/get operations do not apply those filters.
      if (
        path === '/admin/impersonate-user' &&
        permissions.can('impersonate', 'System')
      )
        return;
      if (
        [
          '/admin/list-user-sessions',
          '/admin/revoke-user-session',
          '/admin/revoke-user-sessions',
        ].includes(path) &&
        permissions.can('manage-sessions', 'System')
      )
        return;
      throw new APIError('FORBIDDEN', {
        message:
          'Use the authorized domain operation; physical user deletion is disabled',
      });
    }),
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  advanced: {
    database: {
      // Let Neon generate a UUID
      generateId: false,
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: userInBetterAuth,
      session: sessionInBetterAuth,
      account: accountInBetterAuth,
      verification: verificationInBetterAuth,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: 'User',
      roles: {
        User: userAc,
        Officer: defaultAc.newRole({ user: [], session: [] }),
        Administrator: defaultAc.newRole({
          user: [],
          session: [],
        }),
        Developer: defaultAc.newRole({
          user: ['impersonate', 'impersonate-admins'],
          session: ['list', 'revoke'],
        }),
      },
      impersonationSessionDuration: 60 * 60 * 24, // 1 day
    }),
    // phoneNumber({
    //   sendOTP: ({ phoneNumber, code }, ctx) => {
    //     // TODO: Implement sending OTP code via SMS
    //   },
    // }),
    tanstackStartCookies(), // MUST BE LAST PLUGIN IN ARRAY
  ],
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    fields: {
      createdAt: 'timestampCreatedAt',
      name: 'display',
      updatedAt: 'timestampUpdatedAt',
    },
    additionalFields: {
      deletedAt: { type: 'date', input: false, required: false },
      canManageScheduling: {
        type: 'boolean',
        input: false,
        defaultValue: false,
      },
      canManageUsers: { type: 'boolean', input: false, defaultValue: false },
      nameFirst: { type: 'string', input: true },
      nameMiddle: { type: 'string', input: true, required: false },
      nameLast: { type: 'string', input: true },
      phoneNumber: { type: 'string', input: true, required: false },
      phoneNumberVerified: { type: 'boolean', input: false },
      postNominals: { type: 'string', input: true, required: false },
      status: {
        // IMPORTANT: Any changes to this enum need to be manually reflected in the database schema
        type: ['active', 'inactive', 'invited'],
        input: false,
      },
      timestampFirstLogin: {
        type: 'date',
        required: false,
        input: false,
      },
      timestampOnboardingCompleted: {
        type: 'date',
        required: false,
        input: false,
      },
      userTypeId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession['user'];
export type CurrentUserType = Infer<typeof userTypeSchema>;
export type AuthSessionWithUserType = AuthSession & {
  userType: CurrentUserType | null;
};
export type CurrentUser = Omit<AuthUser, 'name'> & {
  display: AuthUser['name'];
  impersonatedBy?: string;
  userType: CurrentUserType | null;
};
