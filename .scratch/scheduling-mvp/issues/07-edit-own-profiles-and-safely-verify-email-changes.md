## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Users can maintain their basic profile and change email without making the unverified new address a sign-in identifier prematurely.

Parent user stories covered: 8, 9, 10, 11, 12.

## Acceptance criteria

- [ ] Expose own basic profile editing with required name/contact validation, normalized country-code phone, generated display name, and optional middle name/photo/post-nominals.
- [ ] Do not allow own profile editing to change role, Officer grants, user type, verification state, lifecycle status, or onboarding authority.
- [ ] Store/request the pending email change without replacing the currently verified sign-in identity until the new address is verified; the existing verified sign-in remains usable in the interim.
- [ ] Send verification at the new address and a security notice at the old address through the authentication email mechanism, without an operational in-app email-change notification.
- [ ] Verify successful and unverified changes, conflicting identities, spoofed ownership, both supported authentication paths where relevant, and correct destination addresses using controlled email/provider adapters.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#5](https://github.com/groneman7/ccru-start/issues/5)
- [#6](https://github.com/groneman7/ccru-start/issues/6)
