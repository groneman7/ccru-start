## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Developers can inspect and recover retained profiles, reference data, templates, and notification records while preserving original data and revoked-credential safety.

Parent user stories covered: 109, 110, 111.

## Acceptance criteria

- [ ] Provide a Developer-only recovery surface and server commands for retained user profiles, user types, certification catalog/user-certification records, positions, saved locations, templates/owned records, and soft-deleted notification/comment records where applicable. Include Developer soft deletion of historical items subject to their existing domain restrictions; no domain physical deletion.
- [ ] Preserve original business values, statuses, timestamps, and identity. Restore only owned descendants deleted with the root operation; never revive independently deleted records implicitly.
- [ ] Validate current reference/hierarchy/uniqueness integrity atomically before recovery, including restoration of links to currently deleted parents. Do not silently change approved eligibility or user-type semantics to make restoration pass.
- [ ] Keep lifecycle deactivation and domain deletion distinct; profile recovery must not revive expired/revoked authentication credentials or invent a new active status.
- [ ] Recovery is quiet: no new volunteer/staff/review messages, assignment rechecks, automatic pending confirmations, or redelivery of existing notifications. Existing review state and delivered text remain unchanged.
- [ ] Verify Developer-only direct access, preserved values and soft-deletion boundaries, structural rollback, deleted-reference link checks, notification/comment retention without a full transition archive, and quiet qualification/profile recovery.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
