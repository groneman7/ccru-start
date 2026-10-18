## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Assigned volunteers receive logistical event changes, and schedulers can irreversibly cancel an event while retaining the appropriate notification/history access.

Parent user stories covered: 84, 85, 86, 87, 95, 99, 100, 102.

## Acceptance criteria

- [ ] Notify assigned volunteers on date/time/location changes and cancellation; title/description edits do not notify. Requested rechecks remain independently default-OFF rather than implicit scans.
- [ ] Expose scheduler cancellation with standard message plus optional custom text; atomically change all non-deleted active-capacity assignments to cancelled and retain their data.
- [ ] Cancellation releases capacity/monthly participation, resolves underlying assignment/withdrawal review work, and runs targeted pending resolution only for affected released participation.
- [ ] Cancellation cannot be undone. Public/ordinary volunteer calendars hide it, affected volunteers retain notification/history access, and schedulers retain full scheduling/history access.
- [ ] Keep cancelled/rejected/already-deleted assignments out of newly cancelled active recipients and avoid duplicate notification delivery or partial state under concurrent cancellation/assignment.
- [ ] Verify event-change delivery/non-delivery, immutable messages, cancellation atomicity, current participant recipient selection, released monthly priority, and direct history/calendar projections.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
