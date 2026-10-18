## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Volunteers submit certifications, user managers review them, and a usable in-app inbox supports shared review state, personal dismissal, and rejection messages.

Parent user stories covered: 32, 33, 34, 35, 36, 37, 38, 97, 98, 99, 100, 102.

## Acceptance criteria

- [ ] Persist a user-certification relation with pending/verified/rejected status separate from the catalog. Volunteer submission is pending; manager creation/approval is verified immediately.
- [ ] Allow own pending edit while keeping pending, own pending withdrawal by soft deletion, and rejected edit/resubmission on the same record. Only a user manager can remove verified certifications.
- [ ] Provide the shared user-management review queue, visible to effective user managers, without claiming work. Each recipient has independent read/dismiss state; resolving the underlying submission closes the item globally.
- [ ] Pending edits keep the same review item current; withdrawal resolves it. Rejection retains the record and delivers an optional reviewer comment to the volunteer. Approval does not create a certification-approval notification.
- [ ] Introduce the reusable in-app personal/shared notification behavior through this working flow. Delivered text is copied independently of later comment/review changes; notification/comment records use appropriate soft deletion.
- [ ] Display certification information on permitted profiles and block catalog deletion while linked by non-deleted user-certification records; deleted links alone do not block.
- [ ] Test full submit/edit/withdraw/approve/reject/resubmit flows, mutation authority versus full-profile viewing, individual versus global state, immutable delivered text, and intentional absence of approval messages.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
