## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

A user manager can pre-create a profile, send/resend/revoke an invitation, and the volunteer can claim that same profile through either supported authentication method.

Parent user stories covered: 4, 13, 14, 15, 16, 17, 20, 21, 29.

## Acceptance criteria

- [ ] Provide a create-profile form with first/last name and email, optional middle name, and optional separate invitation sending; phone may be supplied at onboarding. Preserve the created profile when an invitation is revoked.
- [ ] Deliver an invitation through the required email mechanism. Invitations do not expire; resend invalidates the previous link and revoke prevents claiming through that credential.
- [ ] Verified case-insensitive matching email through email/password or Google claims the existing profile rather than creating a duplicate; preserve its identity and existing assignments. Review account linking against this verified identity contract.
- [ ] Make claim/resend/revoke atomic: the first completed operation governs subsequent valid actions. A claimed profile cannot subsequently be treated as an unclaimed invitation.
- [ ] In open mode, verified matching self-registration may claim an existing profile after invitation revocation, but revoked credentials remain unusable. Outstanding invitations survive a change to open mode.
- [ ] Unclaimed profiles cannot obtain volunteer scheduling access until verified sign-in and required onboarding. Expose invited profiles as permitted scheduler assignment targets without making inactive users assignable.
- [ ] Test both providers, mismatched/unverified identity, case-insensitive duplicates, stale invitation links, retained assignments, and claim/resend/revoke races with a test email sink and isolated database.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
