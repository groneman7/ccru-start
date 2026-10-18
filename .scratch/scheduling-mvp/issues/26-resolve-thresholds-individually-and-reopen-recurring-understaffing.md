## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers can manually resolve the current threshold without silencing later urgency, and alerts return when a filled shift becomes vacant again.

Parent user stories covered: 98, 99, 104, 107, 108.

## Acceptance criteria

- [ ] Expose manual threshold-specific global resolution even while vacancies remain; reaching a different/new threshold creates an actionable alert according to severity/lead-time rules.
- [ ] Filling a shift resolves the applicable alert; a later vacancy while a threshold remains active makes the alert actionable again.
- [ ] Recompute one highest unresolved severity per shift and keep lower thresholds in details without making resolution shift-wide or event-wide.
- [ ] Personal dismiss/read affects only that recipient and never globally resolves or suppresses new urgency.
- [ ] Verify manual resolution, later threshold activation, fill/vacate cycles, multiple scheduler recipients, repeat reconciliation, and cancellation/deletion/end termination with controlled time and focused alert controls.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#27](https://github.com/groneman7/ccru-start/issues/27)
