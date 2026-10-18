## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers can approve or reject reserved pending assignments in the shared review UI and volunteers receive the appropriate immutable decision message.

Parent user stories covered: 49, 50, 51, 69, 72, 96, 98, 99, 100, 102.

## Acceptance criteria

- [ ] Provide shared pending-assignment review without claiming items; access follows effective scheduling capability, not full-profile viewing or user-management capability.
- [ ] Approve into confirmed or reject into retained rejected state with optional comment. Rejection frees occupancy and monthly participation; permit later same-shift retry as a new slot.
- [ ] Approval/suppression covers all current conflicts as one decision and never changes a position expression or persists conflict/suppression identifiers/history.
- [ ] Keep only latest transition metadata; a new transition without comment clears prior text, while already delivered decision text remains unchanged.
- [ ] Resolve underlying review globally while keeping personal read/dismiss independent, and send the approved volunteer approval/rejection notifications.
- [ ] Make pending assignments read-only for end users, showing generic contact-schedulers instructions rather than editing/withdrawal or a new in-app contact workflow.
- [ ] Verify decision authorization, concurrent/stale reviews, released capacity/monthly participation, retry, comment optionality/clearing, immutable messages, and shared-versus-personal queue behavior.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#17](https://github.com/groneman7/ccru-start/issues/17)
