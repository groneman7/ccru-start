## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers configure the monthly limit and assignment decisions consistently rank distinct event participation in America/New_York.

Parent user stories covered: 57, 58, 59, 60, 68, 81.

## Acceptance criteria

- [ ] Persist the organization-wide monthly limit, default 3, with scheduler-only settings UI/server changes.
- [ ] Count distinct non-cancelled/non-deleted events with remaining confirmed/pending/available participation, including past events in the event-start month; exclude rejected/cancelled/deleted assignments and avoid candidate double-counting.
- [ ] Rank each event by the earliest timestamp among the volunteer's remaining active-capacity assignments in that event, not confirmation time. Multiple positions count once; removing the earliest may change priority.
- [ ] Evaluate in America/New_York event-start month regardless of request/replacement time or host timezone. Preserve same-event priority and support new timestamps for different-event moves/replacement integration.
- [ ] Integrate over-limit conflicts into scheduler assignment explanations and suppression/pending decisions. Only participation beyond the first N is over-limit; overlapping separate-event times are not a conflict rule.
- [ ] Changing a limit does not perform opt-out detection scans/previews. Subsequent resolution/recheck slices add their respective targeted behaviors without conflating them.
- [ ] Refuse to enable enforcement over incomplete retained assignment timestamps without the approved policy from the conditional audit prerequisite.
- [ ] Verify first-N ordering, pending reservations, multiple positions, past current-month events, candidate exclusion, concurrent same-user requests, year/month/DST boundaries, and settings authorization through real-database operations.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#15](https://github.com/groneman7/ccru-start/issues/15)
