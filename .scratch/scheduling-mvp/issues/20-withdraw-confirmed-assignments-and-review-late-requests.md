## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Volunteers withdraw immediately outside the late window or retain responsibility in available state inside it, with scheduler release/denial controls.

Parent user stories covered: 60, 61, 62, 63, 64, 69, 70, 71, 82, 96, 100.

## Acceptance criteria

- [ ] Persist and expose scheduler control of the organization-wide late-withdrawal window, default 72 hours, using event start and the operation clock.
- [ ] Strictly before start, a confirmed volunteer outside the window immediately soft-deletes the slot with on-screen success and no additional in-app notification.
- [ ] Inside the window set available, retaining incumbent responsibility, occupied capacity, monthly participation, and a shared withdrawal review item.
- [ ] Display available status and incumbent name in the permitted roster projection. Available is replacement availability, not an understaffed vacancy or pending candidate.
- [ ] Scheduler release soft-deletes and makes a genuinely vacant seat without a volunteer notification solely for release approval; denial returns confirmed and notifies with optional comment.
- [ ] Release resolves the underlying withdrawal/warning and invokes targeted resolution for affected pending participation. End users cannot change pending slots or make any slot change at/after start; schedulers can act indefinitely, and available can persist after start.
- [ ] Verify both sides of the configured window, exact start cutoff, preserved owner/capacity/monthly rank, generic pending contact UI, denial/release message rules, and affected automatic resolution.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#19](https://github.com/groneman7/ccru-start/issues/19)
- [#21](https://github.com/groneman7/ccru-start/issues/21)
