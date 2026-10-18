## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

User managers can create, organize, rename, and safely remove reusable certification definitions in the catalog UI.

Parent user stories covered: 31, 37, 109.

## Acceptance criteria

- [ ] Support the existing parent/child certification hierarchy through working user-manager screens and server validation; training levels and specialties use this same catalog.
- [ ] Renaming preserves certification identity and changes displayed names wherever that certification is referenced.
- [ ] Reject invalid hierarchy relationships, including cycles, without creating another eligibility dimension or certification effective/expiration dates.
- [ ] Soft-delete catalog records, exclude them from normal selection, and block deletion for current non-deleted children or other existing live references. Later relation/expression slices add their reference guards with the new references.
- [ ] Test authorized and unauthorized catalog changes, hierarchy behavior, stable identity on rename, and retained deleted references through server operations and focused catalog UI checks.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#4](https://github.com/groneman7/ccru-start/issues/4)
