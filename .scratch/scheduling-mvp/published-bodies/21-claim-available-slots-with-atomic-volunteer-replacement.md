## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

A qualifying volunteer or authorized scheduler can replace an incumbent in the same available slot without extra capacity or a pending replacement candidate.

Parent user stories covered: 63, 65, 66, 67, 68, 70, 71, 100, 101, 102.

## Acceptance criteria

- [ ] Provide an available-slot claim action strictly before start for active end users; require all eligibility, monthly, and duplicate-event checks to pass or hard-block.
- [ ] Permit scheduler replacement after start/past end, but require immediate suppress-all for conflicts; never leave a replacement pending.
- [ ] Atomically update the existing slot to the replacement owner and confirmed state, preserving slot identity/capacity while assigning the replacement a new assignment timestamp and latest replacement comment.
- [ ] Release the incumbent's event participation only if no other active-capacity assignment remains there; use the event-start month for both users and trigger targeted resolution for the released participation.
- [ ] Resolve withdrawal/review warnings, notify the released incumbent, and use the ordinary confirmation path for exactly one replacement confirmation; do not create a second candidate/incumbent slot or history archive.
- [ ] Concurrent claims have one winner, stale ownership changes do not overwrite a newer replacement, and failure leaves the incumbent and occupancy intact.
- [ ] Verify same-slot identity, January-event/December-claim counting, new priority, failed checks, scheduler suppression, concurrency, message deduplication, and takeable-slot UI. Once a release makes it vacant, ordinary pending signup rules apply.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
