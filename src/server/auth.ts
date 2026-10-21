import type { userTypeSchema } from '~/features/authz/schema';
import {
  CONTACT_ORGANIZATION,
  registrationMode,
} from '~/features/registration/policy';
import { profileFieldsSchema } from '~/features/users/schema';
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
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import type { infer as Infer } from 'zod';

config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendAuthEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const { error } = await resend.emails.send({
    from: 'no-reply@ccruoutreach.org',
    ...input,
  });
  if (error) {
    // Resend returns API failures as data rather than rejecting the promise.
    throw new Error(`Authentication email failed: ${error.name}`);
  }
}

export const auth = betterAuth({
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const path = ctx.path ?? '';
      if (path === '/sign-up/email') {
        if ((await registrationMode()) !== 'open')
          throw new APIError('FORBIDDEN', { message: CONTACT_ORGANIZATION });
        const parsed = profileFieldsSchema
          .pick({ nameFirst: true, nameLast: true, nameMiddle: true })
          .safeParse({
            nameFirst: ctx.body?.nameFirst,
            nameLast: ctx.body?.nameLast,
            nameMiddle: ctx.body?.nameMiddle ?? null,
          });
        if (!parsed.success)
          throw new APIError('BAD_REQUEST', {
            message: 'First and last names are required',
          });
        Object.assign(ctx.body!, parsed.data, {
          name: [
            parsed.data.nameFirst,
            parsed.data.nameMiddle,
            parsed.data.nameLast,
          ]
            .filter(Boolean)
            .join(' '),
        });
      }
      if (
        path === '/update-user' &&
        [
          'name',
          'display',
          'nameFirst',
          'nameMiddle',
          'nameLast',
          'phoneNumber',
          'postNominals',
          'image',
          'email',
        ].some((key) => Object.hasOwn(ctx.body ?? {}, key))
      )
        throw new APIError('FORBIDDEN', {
          message: 'Use the validated profile operation',
        });
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
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if ((await registrationMode()) !== 'open')
            throw new APIError('FORBIDDEN', { message: CONTACT_ORGANIZATION });
          return {
            data: {
              ...user,
              name:
                [user.nameFirst, user.nameMiddle, user.nameLast]
                  .filter(Boolean)
                  .join(' ') || user.name,
            },
          };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const profile = await db.query.userInBetterAuth.findFirst({
            where: eq(userInBetterAuth.id, session.userId),
          });
          if (!profile || profile.deletedAt || profile.status === 'inactive')
            throw new APIError('FORBIDDEN', {
              message: 'This account is inactive. Contact the organization.',
            });
          await db
            .update(userInBetterAuth)
            .set({
              timestampFirstLogin: sql`COALESCE(${userInBetterAuth.timestampFirstLogin}, CURRENT_TIMESTAMP)`,
            })
            .where(
              and(
                eq(userInBetterAuth.id, session.userId),
                isNull(userInBetterAuth.deletedAt),
              ),
            );
          return { data: session };
        },
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
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
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: 'Verify your email address',
        html: `<p>Click <a href="${url}">here</a> to verify your email address.</p>`,
      });
    },
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
      mapProfileToUser: (profile) => ({
        nameFirst: profile.given_name?.trim() || null,
        nameLast: profile.family_name?.trim() || null,
      }),
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
      nameFirst: { type: 'string', input: true, required: false },
      nameMiddle: { type: 'string', input: true, required: false },
      nameLast: { type: 'string', input: true, required: false },
      phoneNumber: { type: 'string', input: true, required: false },
      phoneNumberVerified: {
        type: 'boolean',
        input: false,
        defaultValue: false,
      },
      postNominals: { type: 'string', input: true, required: false },
      status: {
        // IMPORTANT: Any changes to this enum need to be manually reflected in the database schema
        type: ['active', 'inactive', 'invited'],
        input: false,
        defaultValue: 'invited',
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
