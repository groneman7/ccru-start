## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

An active volunteer can request a vacant seat before event start, receive one confirmation when eligible, or reserve a pending seat with understandable conflict reasons.

Parent user stories covered: 41, 44, 45, 46, 47, 48, 51, 69, 70, 101.

## Acceptance criteria

- [ ] Allow only active, verified, onboarded volunteers to request strictly before event start through the authoritative assignment command.
- [ ] Passing current eligibility/monthly checks creates confirmed; failed eligibility/monthly checks explain reasons preserving alternative branches and permit explicit pending submission.
- [ ] Pending reserves the seat and monthly participation, displays own pending status, creates the shared scheduling review item, and is never a waitlist.
- [ ] Hard-block another active-capacity assignment in the same event and full shifts without an available replacement. Do not reserve an over-capacity pending request.
- [ ] Send exactly one confirmed-self-signup in-app confirmation; pending shows status/review without a duplicate confirmation. Reject end-user slot changes at start and any pending edit/withdrawal.
- [ ] Retained rejection does not block a new same-shift request. End users cannot atomically switch positions.
- [ ] Test successful/pending/fourth-distinct-event outcomes, full/duplicate blocking, two concurrent last-seat requests, simultaneous same-user requests, exact start cutoff, retry, and branch-preserving signup UI.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
