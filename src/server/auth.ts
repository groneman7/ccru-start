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
    admin({
      defaultRole: 'User',
      roles: {
        User: userAc,
        Officer: adminAc,
        Administrator: adminAc,
        Developer: adminAc,
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
      nameFirst: { type: 'string', input: true },
      nameMiddle: { type: 'string', input: true, required: false },
      nameLast: { type: 'string', input: true },
      phoneNumber: { type: 'string', input: true, required: false },
      phoneNumberVerified: { type: 'boolean' },
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
        input: true,
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
export type CurrentUser = Omit<AuthUser, 'name'> & {
  display: AuthUser['name'];
  impersonatedBy?: string;
};
