## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Developers can restore a standalone slot or shift with original assignment state/priority while recoverable scheduling conflicts are suppressed and structural failures reject atomically.

Parent user stories covered: 109, 110, 111, 113.

## Acceptance criteria

- [ ] Extend Developer recovery to standalone slots and shifts, preserving original owner, business values, assignment timestamps, and confirmed/pending/available states and latest metadata.
- [ ] Suppress monthly-limit, eligibility, and duplicate-event conflicts as the approved exceptional restoration decision; do not persist conflict lists/suppression history or turn restoration into a new signup.
- [ ] Reject duplicate live event/position associations, insufficient capacity, inactive users, and active assignments beneath cancelled or still-deleted parents. Restore a shift and only its cascade-deleted children atomically.
- [ ] Create no new volunteer/staff/review notifications, rechecks, automatic confirmations, or message redelivery; preserve existing review states and keep confirmed confirmed and pending pending.
- [ ] Restored participation retains original monthly priority. Do not automatically demote/flag/notify another newly over-limit assignment; later ordinary evaluations and explicit rechecks include restored data.
- [ ] Restore owned alert configuration only according to cascade provenance and allow ordinary scheduled understaffing evaluation to resume, without conflating that later evaluation with restoration workflow replay.
- [ ] Verify suppressed versus structural failures, whole-operation rollback, independently deleted descendants, states/timestamps, no automatic side effects, later explicit rechecks/signup evaluation, and subsequent normal alert reconciliation.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
