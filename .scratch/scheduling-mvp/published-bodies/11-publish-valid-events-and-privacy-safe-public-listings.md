## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers create/edit events with valid local times, and signed-out visitors see only permitted current event details until event end.

Parent user stories covered: 1, 2, 83, 89.

## Acceptance criteria

- [ ] Require event start and end with end strictly later on the same America/New_York calendar date; new events publish immediately without drafts or cross-midnight support.
- [ ] Implement authoritative upcoming/in-progress/past boundaries: upcoming before start, in progress from start inclusive to end exclusive, past at end.
- [ ] Provide signed-out event listing/detail responses containing only title/name, date, time, location, description. Do not return staffing, positions, capacity, vacancy counts, assignments, roster names, or profile data.
- [ ] Remove cancelled/deleted events and remove public events exactly at end; no public past-event access. Use explicit audience projections, not browser-only hiding.
- [ ] Schedulers can edit past events indefinitely and use current related data without snapshots, closure deadlines, or attendance outcomes. Assignment notifications are added when the assignment/cancellation slice integrates them.
- [ ] Apply the retained-data audit findings before enforcing required end times; missing existing end values need explicit correction rather than an inferred duration.
- [ ] Verify direct public payloads and routes, timezone/host independence, positive duration and local-date boundaries, past editing, and exact start/end behavior with a controllable clock.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
