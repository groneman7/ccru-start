# Email verification options

Research checked 2026-10-20. This note proposes options for issue #6; it does not configure a provider, change authentication, or send email.

## Recommendation

Use **Resend with an organization-owned sending subdomain** for the MVP, assuming the organization can edit DNS and approves the service. This is an engineering recommendation based on the small integration surface and published free allowance, not a claim that one provider guarantees better inbox placement. Keep Better Auth responsible for verification tokens and status; use the provider only to deliver messages. The same delivery integration can later support password resets.

The current `src/server/auth.ts` enables email/password authentication but has neither a verification-email sender nor `requireEmailVerification`. Installed Better Auth 1.6.25 supports the needed configuration: its sign-in implementation rejects unverified credentials when required and can resend verification through `sendOnSignIn`; its signup implementation supports `sendOnSignUp`.

## Practical choices

Prices are published USD list prices checked on the research date; reassess before buying.

| Option | Published starting allowance | Fit and setup tradeoff |
| --- | --- | --- |
| **Resend** | Free: 3,000 emails/month, capped at 100/day. Pro: $20/month for 50,000. | Recommended MVP starting point. Verify a sending domain and create a server-side API key. Count verification resends and password resets against the daily limit; a large onboarding batch can exceed 100 even with few monthly users. [Pricing](https://resend.com/pricing), [verified domains](https://resend.com/docs/dashboard/domains/introduction). |
| **Postmark** | Free Developer: 100 emails/month. Basic starts at $15/month for 10,000. | Reasonable alternative if the organization prefers its transactional-email tooling and a paid starting budget. Its free plan is much smaller; there is no intermediate allowance between 100 and 10,000. [Pricing](https://postmarkapp.com/pricing/). |
| **Amazon SES** | Base outbound charge: $0.10/1,000, plus applicable data and optional-service charges. | Consider if the organization already operates AWS and can own identity, permissions, production-access approval, and delivery monitoring. New sandbox accounts can send only to verified recipients or the mailbox simulator, at most 200 messages/day and one/second; sandbox mode cannot serve ordinary public registration. [Pricing](https://aws.amazon.com/ses/pricing/), [production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). |
| **Existing Google Workspace or Microsoft 365 mail service** | Depends on the existing subscription, administrator policy, and sending limits. | Explore with the organization's mail administrator if this is already available. Google documents app SMTP relay. Microsoft offers authenticated submission and connector relay, but its connector relay has hosting/IP/certificate/port restrictions and is not a generic option for third-party hosted apps. Do not assume a personal mailbox password or a new SMTP connector will work from the deployment host. [Google app SMTP](https://support.google.com/a/answer/176600?hl=en), [Microsoft application sending options](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365). |

## Setup to investigate first

1. Confirm who owns the organization's domain, who can edit DNS, and whether an existing mail administrator has an approved outbound service. Pick a sender such as `accounts@notify.example.org` and a monitored support/reply address.
2. Verify the sending subdomain using the chosen provider's exact DNS records. Resend supports subdomains and recommends them to separate sending reputation. Sending-only setup does not require moving the organization's existing inboxes to the provider. [Domain guide](https://resend.com/docs/dashboard/domains/introduction).
3. Configure SPF/DKIM and review existing DMARC policy and alignment with the mail administrator. Where a DMARC rollout is new, monitor legitimate senders before tightening enforcement; preserve an existing working policy. Do not blindly replace organization DNS records. [DMARC guide](https://resend.com/docs/dashboard/domains/dmarc).
4. Estimate the busiest onboarding day, including resends and resets. Confirm provider approval and production sending restrictions before relying on delivery for access.
5. Check organization vendor/privacy requirements: these services process recipient addresses and message contents, which include bearer verification links. Send only account-related content needed for the message.

## Better Auth integration and issue #6

Better Auth accepts `emailVerification.sendVerificationEmail({ user, url, token })`. Configure automatic signup delivery, a resend UI, expiry/error handling, and the existing-user path; then enforce verified email for email/password sign-in. Existing unverified accounts need an accessible verification path before enforcement is switched on. Preserve existing verified values and gate onboarding using trusted verification status rather than treating a sent message or officer approval as proof of mailbox ownership. Provider delivery/bounce events are operational signals, not verification events. [Better Auth email guide](https://better-auth.com/docs/concepts/email).

The official email guide currently describes a newer version than the installed 1.6.25, so implementation should continue to check the installed API/source. In particular, email/password verification enforcement does not substitute for issue #6's application-level onboarding rule across authentication methods. Google login is useful for those who can use it, but it does not verify a different credential-account address merely because two accounts are linked.

Keep delivery promises alive on the deployment platform: do not copy a bare fire-and-forget `void sendEmail(...)` into a serverless handler. Better Auth recommends a supported `waitUntil`-style mechanism to avoid request timing leaks while ensuring delivery continues. Check the installed framework/runtime integration and handle failed sends so the user can retry. [Better Auth delivery guidance](https://better-auth.com/docs/concepts/email).

For automated tests, capture outgoing messages through a test-only delivery sink and exercise the actual verification URL with an isolated database. Provider simulators help test delivery/bounce handling but do not prove inbox placement or mailbox ownership; Resend supplies delivered/bounced/complained simulation recipients. Finish with an explicitly authorized smoke test to real organization mailboxes. [Resend test recipients](https://resend.dev/).

Disable click/open tracking for verification and password-reset messages so token-bearing links are not unnecessarily rewritten or tracked; Resend specifically supports leaving tracking off for sensitive transactional messages. Some organization mail systems inspect links, so test the actual recipient environment. If scanners consume verification links, evaluate an explicit confirmation screen or Better Auth's OTP option rather than weakening verification. This scanner-specific behavior is a deployment risk to test, not a finding about the current app. [Tracking guidance](https://resend.com/docs/dashboard/domains/introduction), [verification links and OTP](https://better-auth.com/docs/concepts/email).

## If delivery cannot be ready for MVP

Temporarily permitting unverified email/password access is a separate product decision that changes issue #6's verified-registration requirement. Keep `emailVerified=false`, retain the ability to verify later, and document exactly which onboarding/access restriction is relaxed. Never backfill `emailVerified=true` simply to unblock registration. This note makes no such change.
