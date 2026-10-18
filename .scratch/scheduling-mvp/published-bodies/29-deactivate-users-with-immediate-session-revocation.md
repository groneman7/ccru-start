## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

User managers can deactivate a user only after upcoming active responsibilities are removed, and successful deactivation immediately ends access.

Parent user stories covered: 22, 23, 109.

## Acceptance criteria

- [ ] Expose authorized activation/deactivation controls on managed profiles, preserving identity, role, explicit lifecycle data, and relationships.
- [ ] Block deactivation for any upcoming non-deleted confirmed/pending/available assignment; exclude cancelled/rejected/deleted assignments and use start-strictly-future semantics.
- [ ] Successful deactivation revokes existing sessions immediately, prevents new sign-in through both providers, and prevents assignment from every server path. Invited-profile assignment remains the approved exception rather than allowing inactive assignment.
- [ ] Keep domain profiles retained. Removing revoked/expired sessions and one-use verification/reset tokens is allowed and must not preserve usable revoked credentials.
- [ ] Avoid a race in which deactivation and assignment both succeed leaving an inactive user newly assigned; verify using concurrent real-database operations.
- [ ] Test successful/blocked deactivation, active-session invalidation, exact upcoming boundary, both auth paths, invited/inactive differences, and profile UI feedback.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
