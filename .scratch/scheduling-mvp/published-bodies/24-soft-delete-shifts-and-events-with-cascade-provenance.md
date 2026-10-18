## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers can remove staffing or eligible events without physical deletion, while provenance distinguishes descendants removed together from those deleted independently.

Parent user stories covered: 56, 88, 109, 112.

## Acceptance criteria

- [ ] Removing a shift represents zero capacity, soft-deletes its active slots, releases participation, and notifies active-slot volunteers with optional custom text.
- [ ] Block event deletion while active-capacity assignments exist; cancelled/rejected/deleted slots do not block. Cancellation or explicit removals can make the event deletable.
- [ ] Permitted event deletion atomically soft-deletes its shifts and slots, preserving records, timestamps, and required links. Remove physical-delete/cascade-loss paths in these workflows.
- [ ] Track root deletion operation provenance so independently deleted descendants retain their own deletion identity and are distinguishable for later recovery.
- [ ] Resolve affected underlying review items and invoke targeted pending resolution for released participation. Domain records and delivered notifications are retained appropriately.
- [ ] Verify deletion restrictions, entire-shift recipients, atomic rollback, normal-view filtering, independent-descendant provenance, and historical referential rendering. Later threshold creation must integrate its owned records into these cascade rules.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
