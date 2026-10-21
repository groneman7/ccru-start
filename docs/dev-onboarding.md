# Testing without verification or onboarding

A Developer can open **Admin → Users → a user's profile** and toggle
**Development account**. All existing and new accounts default to unflagged;
mark only synthetic test accounts. The flag is separate from system roles and
only Developers can change it through the protected user operation. Registration,
ordinary profile edits, and Better Auth's generic endpoints cannot set it.

Flagged active and invited accounts still authenticate with their existing
password or Google account, but can enter the app without verified email, a phone
number, or completed onboarding in development and preview. Verification emails
are skipped for these accounts. Inactive, banned, and deleted accounts remain
blocked, registration policy still applies, and role permissions remain unchanged.

## Environment switch

Bypasses are enabled by default for flagged accounts in development and preview.
To exercise the full verification/onboarding flow, set:

```dotenv
DEV_ONBOARDING_BYPASS_ENABLED="false"
```

Set it in `.env.local` for local development, or in the Vercel project's **Preview**
environment. Restart the local server or redeploy the preview, then refresh the
page. Set it to `true` or remove it to restore bypasses. Only the exact value
`true` enables an explicitly configured switch; empty or unrecognized values
leave bypasses disabled. The former `DEV_ONBOARDING_BYPASS_EMAILS` allowlist is
no longer used and can be removed.

Vercel's runtime `VERCEL_ENV` must be `preview` or `development`; a local process
without `VERCEL_ENV` must have `NODE_ENV=development`. Production and unknown
deployment environments always enforce normal onboarding, even for flagged
accounts with the switch enabled. `VERCEL_ENV=production` takes precedence over
`NODE_ENV=development`. A standalone production build without `VERCEL_ENV` also
ignores the flag.

The bypass is calculated on the server for each session response and permission
check. It does not mark emails or phones verified, activate invited accounts, or
write onboarding timestamps. Unflagging an account restores normal checks on the
next server operation; refresh other open clients to update their cached session.
Keep using a separate database branch for previews when testing profile changes.

## Database migration

Apply the additive `0009_dev_accounts` migration before starting the updated app.
It adds `better-auth.user.is_dev_account` with a non-null default of `false`.
Use the guarded migration command with an explicitly selected database:

```sh
pnpm db:migrate --check
pnpm db:migrate --apply
```

Both commands require `MIGRATION_DATABASE_URL` in the environment. Application
`.env.local` files are not loaded by the migration runner. No existing users are
automatically flagged.

Phone verification by SMS is currently disabled; normal onboarding requires a
country-code phone number but does not require an SMS verification claim.
