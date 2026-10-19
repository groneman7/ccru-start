import type { userTypeSchema } from '~/features/authz/schema';
import { db } from '~/server/db';
import {
  accountInBetterAuth,
  sessionInBetterAuth,
  userInBetterAuth,
  verificationInBetterAuth,
} from '~/server/db/schema';
import { hasAuthority } from '~/server/permissions/policy';
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
      if (
        path === '/admin/stop-impersonating' &&
        session.session.impersonatedBy
      )
        return;
      if (
        ['/admin/list-users', '/admin/get-user'].includes(path) &&
        hasAuthority(session.user, 'profiles')
      )
        return;
      if (
        [
          '/admin/impersonate-user',
          '/admin/list-user-sessions',
          '/admin/revoke-user-session',
          '/admin/revoke-user-sessions',
        ].includes(path) &&
        hasAuthority(session.user, 'restore')
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
        Officer: defaultAc.newRole({ user: ['list', 'get'], session: [] }),
        Administrator: defaultAc.newRole({
          user: ['list', 'get'],
          session: [],
        }),
        Developer: defaultAc.newRole({
          user: ['list', 'get', 'impersonate', 'impersonate-admins'],
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
