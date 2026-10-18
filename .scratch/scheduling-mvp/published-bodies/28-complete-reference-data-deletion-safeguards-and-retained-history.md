## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Staff can safely remove positions, certifications, user types, templates, and saved locations using the approved live-reference restrictions rather than physical deletion or blanket historical blocks.

Parent user stories covered: 30, 37, 89, 91, 109.

## Acceptance criteria

- [ ] Apply final reference checks across the now-working catalog, position, user type, template, and location management UIs/server operations, retaining appropriate deletion metadata and owned-record provenance.
- [ ] Block position deletion while referenced by future events or templates, but permit it when only past-event references remain; past views must still render retained position data.
- [ ] Block certification deletion for non-deleted user links, child certifications, or expression references. Block user type deletion while assigned to a non-deleted profile; deleted links alone do not block either.
- [ ] Events created from a template never block that template's deletion. Saved-location copies remain independent and deleted records disappear from normal selectors.
- [ ] Avoid physical domain deletion or blanket rejection merely because historical foreign keys exist. Audit remaining catalog/template/location physical-delete paths.
- [ ] Verify each restriction with live versus deleted references, past/current joins, user-type label neutrality, copied-value independence, and direct mutation authority.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
