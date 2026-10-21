# Testing without verification or onboarding

Set `DEV_ONBOARDING_BYPASS_EMAILS` to a comma-separated list of test-account email
addresses. Email matching ignores case and surrounding spaces. Wildcards are not
supported. Leave the three real accounts out of this list to keep exercising their
normal onboarding flow.

For local development, add the list to `.env.local` and restart `npm run dev`:

```dotenv
DEV_ONBOARDING_BYPASS_EMAILS="tester@example.invalid,officer-test@example.invalid"
```

For Vercel previews, configure this variable in the project's **Preview** environment
and redeploy the preview. Vercel's runtime `VERCEL_ENV` must be `preview` or
`development`; a local process without `VERCEL_ENV` must have `NODE_ENV=development`.
Production and unknown deployment environments always ignore the list, including
when `VERCEL_ENV=production` and `NODE_ENV=development` conflict. A standalone
production build without `VERCEL_ENV` also ignores it.

Listed accounts still authenticate with their existing password or Google account.
Active and invited accounts can enter the app without verified email, a phone
number, or completed onboarding. Automatic verification emails are skipped for
these accounts. Inactive, banned, and deleted accounts remain blocked, registration
policy still applies, and roles and permissions remain unchanged.

The bypass is calculated on the server for each session response and permission
check. It does not mark emails or phones verified, activate invited accounts, or
write onboarding timestamps. Removing the variable restores the normal checks;
restart/redeploy and refresh the page to clear cached client session data. Keep
using a separate database branch for previews when testing profile changes.

Phone verification by SMS is currently disabled; normal onboarding requires a
country-code phone number but does not require an SMS verification claim.
