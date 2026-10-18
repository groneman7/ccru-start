## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers can author validated nested position requirements and users can understand the alternative qualification branches.

Parent user stories covered: 39, 40, 41, 42.

## Acceptance criteria

- [ ] Extend position management with arbitrary nested AND/OR over verified exact/descendant-inclusive certifications and hierarchical minimum system role.
- [ ] Validate expression shape and referenced records on the server. Reject NOT, exact-role predicates, user-type predicates, and other unapproved dimensions.
- [ ] No expression permits otherwise assignable active users, retaining the scheduler exception for invited profiles. Unverified certifications and user type do not satisfy eligibility or change platform authority.
- [ ] Use a shared eligibility behavior for subsequent assignment/replacement/recheck commands; provide a working requirement/explanation UI that preserves OR alternatives rather than treating every leaf as mandatory.
- [ ] Keep expressions global to positions, without event/template alternatives. Editing alone does not scan current assignments or preview conflicts.
- [ ] Block certification deletion for non-deleted expression references and keep historical references renderable.
- [ ] Test nested alternatives, exact versus descendant matching, role inheritance, empty requirements, invalid references/language, and explanation rendering at the approved operation/UI seams.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
