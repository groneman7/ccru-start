## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Every Officer can view full profiles, and user managers can edit managed profile information and reusable user type labels through working profile screens.

Parent user stories covered: 24, 30.

## Acceptance criteria

- [ ] Replace placeholder profile views with full permitted profile/contact information; every Officer can view others, while ordinary Users cannot query others' full profiles even through direct operations.
- [ ] User managers can edit permitted managed profile fields and create/rename/assign reusable user type labels; viewing a profile never implicitly grants mutation authority.
- [ ] Treat user type as a display label only, separate from system role, Officer grants, and scheduling eligibility.
- [ ] Retain user type records through soft deletion and reject deletion while assigned to a non-deleted profile; deleted references alone do not block it.
- [ ] Use current profile/type values in permitted responses and avoid adding historical snapshots or exposing extra profile fields through selection/combobox queries.
- [ ] Verify direct-operation access and mutation denials for each audience, along with profile rendering and user type management. Later certification and history slices extend these views with their own domain information.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#4](https://github.com/groneman7/ccru-start/issues/4)
