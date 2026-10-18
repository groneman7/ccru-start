## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers maintain templates and create one event on a selected date with copied details, local times, location, positions/capacities, and alert thresholds.

Parent user stories covered: 54, 83, 90, 91, 92, 103.

## Acceptance criteria

- [ ] Provide template create/edit and one-date event creation, validating required same-date positive-duration local times and at most one live position association per template.
- [ ] Copy event details, time values interpreted on the selected America/New_York date, manual/autofilled location values, capacities, and all configured thresholds atomically into independent event records.
- [ ] Saved-location autofill copies editable values; later saved-location edits do not change templates/events. Later template edits do not propagate to created events.
- [ ] No threshold is required, and templates have no eligibility alternatives, recurring generation, or live alert linkage. Any source-template identifier is optional provenance only.
- [ ] Template soft deletion is not blocked by events created from it; preserve created event data and rendering. Record provenance needed for restoring deleted template-owned records later.
- [ ] Require explicit correction of retained missing template end times under the audit prerequisite rather than inferring them.
- [ ] Verify complete copied values, independence after edits/deletion, duplicate-position and duration validation, atomic creation rollback, timezone boundaries, saved-location form behavior, and copied threshold reconciliation.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#14](https://github.com/groneman7/ccru-start/issues/14)
- [#27](https://github.com/groneman7/ccru-start/issues/27)
