## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Existing pending assignments confirm automatically when their blockers disappear, without demoting confirmed assignments or introducing edit-driven conflict scans.

Parent user stories covered: 59, 72, 80, 81, 82, 100, 101, 102.

## Acceptance criteria

- [ ] Reconsider only affected upcoming pending slots when certification approval, qualifying role change, reduced participation, relaxed requirements, or increased limit removes blockers.
- [ ] Wire the existing qualification/role/position/limit/removal/move operations to targeted resolution; later release/replacement/cancellation commands must invoke the same behavior for affected participation.
- [ ] Confirm only when all checks pass and the event ranks within the first N distinct participations, including past participation in that month and pending priority.
- [ ] With A/B/C/D creation order and limit 3, approving B's needed certification can confirm B while D stays pending. Scheduler-approved over-limit confirmed events do not displace earlier pending priority.
- [ ] Never demote confirmed, scan globally for new conflicts, require opt-in for resolution, or resolve withdrawal requests. Slots at/after start stay untouched.
- [ ] Generate explanatory latest system comment and one in-app confirmation on successful automatic confirmation, resolving the shared review item globally without rewriting old messages.
- [ ] Verify scoped effects and intentional non-effects across all existing triggers using real-database operations and a controllable clock, including no detection preview or volunteer demotion notification.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#20](https://github.com/groneman7/ccru-start/issues/20)
