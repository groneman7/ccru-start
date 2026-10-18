## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Active volunteers can browse events and rosters and access their own relevant history without receiving other volunteers' review/profile information.

Parent user stories covered: 43, 87, 89, 93, 94, 95.

## Acceptance criteria

- [ ] Show active signed-in volunteers upcoming events regardless of certifications, roster names, and their own pending status. Later available-slot actions use the same restricted projection.
- [ ] Omit other volunteers' pending/review/conflict indicators and staff decision comments from volunteer responses; roster access never grants full profile access.
- [ ] At event end, permit volunteer past-event access only where that volunteer was assigned, including retained cancelled-event relationships. Unrelated history and direct query bypasses are denied.
- [ ] Schedulers can access all scheduling events/history, including cancellations and review information; public responses remain limited to the public projection.
- [ ] Render current related profile/position/user-type data, keeping permitted past-event joins renderable after catalog soft deletion without snapshots or event closure.
- [ ] Verify exact start/end boundaries and adversarial direct responses for public, volunteer, Officer without scheduling grant, and scheduler audiences; add focused roster/history UI checks.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#15](https://github.com/groneman7/ccru-start/issues/15)
