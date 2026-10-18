## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers can reassign or remove volunteers atomically, including after start, with correct capacity, priority, and notifications.

Parent user stories covered: 49, 53, 59, 71, 72, 100.

## Acceptance criteria

- [ ] Provide scheduler drag/drop reassignment through the same authoritative command rather than an alternate unchecked mutation path.
- [ ] Move atomically with current eligibility/monthly/duplicate-event checks, optional suppress-all or pending decision, and destination capacity expansion when required.
- [ ] Preserve assignment timestamp for a position move within one event; start a new timestamp for a move to another event and correctly recalculate remaining earliest participation priority.
- [ ] Remove an assignment by soft deletion, release its capacity/monthly participation, retain original data, and deliver approved affected-volunteer messages with optional comments.
- [ ] Permit scheduler action on in-progress/past events indefinitely while preserving end-user restrictions.
- [ ] Prevent stale drag/drop/reassignment from overwriting a newer owner/state. Failed moves leave source/destination/notifications consistent without partial changes.
- [ ] Verify real-database races, timestamp/priority behavior, overflow rollback, inactive target rejection, optional comments, notifications, and focused drag/drop UI behavior.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#18](https://github.com/groneman7/ccru-start/issues/18)
