## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Administrators can grant the two Officer capabilities in the UI, while existing application and authentication operations enforce the approved authority boundaries on the server.

Parent user stories covered: 24, 25, 26, 27, 28.

## Acceptance criteria

- [ ] Persist and manage exactly the scheduling-management and user-management Officer grants; ordinary Users cannot receive them, Officers cannot delegate them, and Administrator/Developer effectively have both.
- [ ] Keep exactly one hierarchical role per user. Administrators can change User/Officer/Administrator roles; only Developers can grant Developer or change an existing Developer's role.
- [ ] Resolve actor identity from the trusted session and protect existing calendar, profile, certification, authorization, onboarding, and relevant Better Auth/plugin operations. Client actor IDs, roles, grants, or completion flags cannot establish authority.
- [ ] Preserve every Officer's full-profile viewing and saved-location-management authority independently of mutation grants. Restrict restoration to Developers and avoid a granular authorization-rules editor.
- [ ] First consolidate only the guards/entry points necessary to close existing bypasses; retain the application stack and existing usable UI rather than introducing a separate architecture rewrite.
- [ ] Introduce the minimal isolated PostgreSQL/session test harness with this behavior slice. Direct-operation and auth/plugin tests prove the role/grant matrix and bypass denials; UI checks verify grant controls reflect effective authority. Preserve explicit existing roles rather than inventing missing user lifecycle values.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.
