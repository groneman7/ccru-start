## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Every Officer can maintain saved locations and use editable autofill in event forms without later source edits changing existing events.

Parent user stories covered: 24, 92, 109.

## Acceptance criteria

- [ ] Provide saved-location creation/editing/soft deletion for every Officer, Administrator, and Developer independently of scheduling/user-management grants.
- [ ] Event forms allow manual name/address entry or saved-location autofill that copies values into editable event data.
- [ ] Later saved-location edits/deletion do not propagate into existing event values. Keep saved-location management authority distinct from permission to save an event.
- [ ] Retain deleted saved locations for later Developer recovery and exclude them from normal selection.
- [ ] Verify full Officer access matrix, unauthorized ordinary-user attempts, editable copied values, and no propagation through operation-level and focused form tests. Template autofill is integrated when its complete template slice lands.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
