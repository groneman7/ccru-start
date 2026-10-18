## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Email/password and Google users follow organization registration mode, verify their email, and complete required onboarding before ordinary scheduling access becomes active.

Parent user stories covered: 3, 5, 6, 7, 8, 9, 21, 29.

## Acceptance criteria

- [ ] Persist organization registration mode with invitation-only as its initial value. Administrator/Developer can change it in the UI; open registration activates ordinary users after verified email and completed onboarding without approval.
- [ ] Both authentication providers deny uninvited account creation in invitation-only mode and show the instruction to contact the organization. The invitation slice later supplies the permitted invited-identity path.
- [ ] Require first name, last name, email, and a phone number with country code; accept ordinary formatting and normalize phone without phone verification. Middle name, image, and post-nominals remain optional; generate display name from name components.
- [ ] Derive onboarding completion and activation server-side, preserve existing verified identity, and deny volunteer scheduling access to unverified, incomplete, invited, or inactive identities as appropriate. Do not trust a client-set completion timestamp.
- [ ] Use controlled external Google/email adapters for auth-handler tests while exercising real application identity/session/database behavior. Verify both-provider gating and completed/incomplete onboarding outcomes through the UI and server.
- [ ] Use the retained-data audit findings before changing required status/name fields. If retained data needs repair, obtain the explicit policy before that migration/activation behavior is enabled; do not invent statuses or change explicit existing roles. No production migration or deployment is authorized.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#3](https://github.com/groneman7/ccru-start/issues/3)
- [#4](https://github.com/groneman7/ccru-start/issues/4)
