## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

User managers can submit a multi-row creation/invitation form and retain successful rows even when other rows fail.

Parent user stories covered: 18, 19.

## Acceptance criteria

- [ ] Provide a multi-row form using the same profile creation and optional invitation commands as individual creation; do not add CSV upload.
- [ ] Persist valid rows and report each invalid/duplicate row individually, including duplicate emails within the batch and emails belonging to existing profiles.
- [ ] An existing-email row fails rather than silently editing, merging, or reinviting an existing profile.
- [ ] Retain successful profile/invitation results when another row fails, and show which rows can be corrected without re-running successful creation implicitly.
- [ ] Verify partial success, concurrent duplicate creation, per-row authorization/validation, delivery outcomes, and useful row feedback through operation-level and focused form tests.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#7](https://github.com/groneman7/ccru-start/issues/7)
