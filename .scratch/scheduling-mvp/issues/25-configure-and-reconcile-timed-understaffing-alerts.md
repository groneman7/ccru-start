## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers configure optional per-shift thresholds and see real time-driven Warning/Critical alerts without relying on page visits or unrelated edits.

Parent user stories covered: 103, 104, 105, 106, 108.

## Acceptance criteria

- [ ] Provide zero-or-more event-shift thresholds with lead time in days/hours and fixed Warning/amber or Critical/red; no separate minimum-filled target or custom severity colors.
- [ ] Count confirmed/pending/available as filled against the shift's full maximum. An incumbent's available slot alone does not cause understaffing.
- [ ] Choose and implement a supported server reconciliation mechanism that runs without page visits or unrelated changes; expose one current highest-unresolved-severity alert per shift with lower thresholds in details.
- [ ] Resolve alerts on filled capacity, cancellation/deletion, or required event end, including time-driven expiry. Use shared scheduler notification/recipient semantics and integrate threshold records with shift/event soft deletion.
- [ ] Persist domain/notification state rather than rendering client-only urgency. Keep assignment rechecks separate; alert reconciliation does not scan for assignment conflicts.
- [ ] Verify threshold activation/end using the reconciliation entry point, controlled clock and isolated database, occupancy for every slot state, fixed presentation, repeated evaluation without duplicate actionable items, and no interaction needed.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#26](https://github.com/groneman7/ccru-start/issues/26)
