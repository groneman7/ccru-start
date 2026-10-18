## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Developers can recover an event and exactly the descendants deleted with it in one quiet operation, without reinstating a cancelled event or partially restoring invalid staffing.

Parent user stories covered: 110, 111, 112, 113.

## Acceptance criteria

- [ ] Provide event recovery through the Developer surface and the established quiet restoration command boundary, restoring the original event and only descendants sharing its root deletion provenance.
- [ ] Keep independently deleted shifts, slots, and owned records deleted; retain business values, original timestamps, assignment states, and copied configuration.
- [ ] Validate all event/shift/slot structural conditions before commit and roll back the entire event on any failure; never partially recover the event.
- [ ] Preserve a cancelled event's cancellation and cancelled slot states. Reject any active assignment beneath a cancelled or still-deleted parent rather than using recovery to reinstate it.
- [ ] Suppress only the approved recoverable scheduling conflicts, retaining original monthly priority without notifying/demoting other assignments.
- [ ] Create no action-triggered volunteer/staff/review messages, assignment rechecks, automatic confirmations, or old-message redelivery. Existing review state remains intact; ordinary later alert evaluation and explicit checks continue normally.
- [ ] Verify a complete delete/recover workflow, independent prior deletions, all-or-nothing structural failures, cancelled-event recovery, visibility through normal permitted views, and quiet side effects through real-database operations.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#34](https://github.com/groneman7/ccru-start/issues/34)
