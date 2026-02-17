import { db } from '~/server/db';
import {
  accountInBetterAuth,
  sessionInBetterAuth,
  userInBetterAuth,
  verificationInBetterAuth,
} from '~/server/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin /* , phoneNumber */ } from 'better-auth/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SYSTEM_ROLE_ID_USER = '019c0720-810c-7eec-b2b5-4b3372d5a769';
const SYSTEM_ROLE_ID_ADMIN = '019c0720-810c-7ec6-9c74-ba2a6c3c0379';
const SYSTEM_ROLE_ID_DEVELOPER = '019c0720-810c-78cc-b3f1-48e219ec1ee7';
const SYSTEM_ROLE_ID_OFFICER = '019c0720-810b-7202-8891-bc4103197f07';

export const auth = betterAuth({
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
    tanstackStartCookies(),
    admin({
      defaultRole: SYSTEM_ROLE_ID_USER,
      roles: {
        [SYSTEM_ROLE_ID_USER]: userAc,
        [SYSTEM_ROLE_ID_ADMIN]: adminAc,
        [SYSTEM_ROLE_ID_DEVELOPER]: adminAc,
        [SYSTEM_ROLE_ID_OFFICER]: adminAc,
      },
      schema: {
        user: {
          fields: {
            role: 'systemRoleId',
          },
        },
      },
      impersonationSessionDuration: 60 * 60 * 24, // 1 day
    }),
    // phoneNumber({
    //   sendOTP: ({ phoneNumber, code }, ctx) => {
    //     // TODO: Implement sending OTP code via SMS
    //   },
    // }),
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
      name: 'displayName',
      updatedAt: 'timestampUpdatedAt',
    },
    additionalFields: {
      nameFirst: { type: 'string', input: true },
      nameMiddle: { type: 'string', input: true },
      nameLast: { type: 'string', input: true },
      phoneNumber: { type: 'string' },
      phoneNumberVerified: { type: 'boolean' },
      postNominals: { type: 'string', input: true },
      status: {
        // IMPORTANT: Any changes to this enum need to be manually reflected in the database schema
        type: ['active', 'inactive', 'invited'],
        input: false,
      },
      timestampFirstLogin: {
        type: 'date',
        input: false,
      },
      timestampOnboardingCompleted: {
        type: 'date',
        input: true,
      },
      systemRoleId: {
        type: 'string',
        input: false,
      },
      userTypeId: {
        type: 'string',
        input: false,
      },
    },
  },
});
