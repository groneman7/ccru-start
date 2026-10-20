# Scheduling MVP implementation notes

Supporting material for [the MVP product design](mvp-design.md). These proposals and dated code observations are not an additional source of business requirements. Reinspect code before editing and preserve unrelated work.

## Proposed data and service design

These are technical recommendations. Agents may refine schema organization while preserving approved behavior.

| Existing/new record          | Required additions or responsibilities                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                         | One role, lifecycle status/deletion metadata; onboarding; pending-email mechanism that preserves verified identity.                                 |
| Officer capability grant     | User, capability key (`scheduling_management`, `user_management`), current grant/deletion metadata.                                                 |
| Organization settings        | Single organization's registration mode, monthly limit, withdrawal window, timezone constant/configuration.                                         |
| Certification catalog        | Existing parent relation plus deletion fields; acyclic hierarchy validation.                                                                        |
| User certification           | User/catalog relation, pending/verified/rejected state, current review comment, deletion fields.                                                    |
| Position                     | Global validated eligibility expression and deletion fields.                                                                                        |
| Event                        | Scheduled/cancelled lifecycle, existing details/timestamps and copied location, deletion fields. No closure/snapshot fields.                        |
| Shift                        | Event/position, positive capacity, deletion fields; unique live position within event.                                                              |
| Slot                         | User/shift, lifecycle state, assignment creation timestamp, latest transition comment/actor/time, deletion fields. No conflict/suppression history. |
| Template position            | Unique live position within template; capacity and copied alert configuration.                                                                      |
| Alert threshold              | Shift/template-position owner, lead time, Warning/Critical severity, deletion fields.                                                               |
| Saved location               | Reusable name/address, deletion fields; event/template address is independent copied data.                                                          |
| Invitation                   | Pre-created user, invited email/token, claim/delivery state, deletion fields; no expiry.                                                            |
| Notification/review item     | Subject/type, recipient scope or personal recipient, message payload, resolved state and deletion fields.                                           |
| Notification recipient state | Per-user read/dismiss state, separate from global resolution.                                                                                       |

Centralize server-side commands for request slot, assign/move, approve/reject, withdraw/deny/replace, cancel/delete/restore, certification review, and recheck. Avoid separate mutation paths with different checks.

Commands should return the resulting authoritative state and any non-persisted conflict explanation needed by the caller. Notifications carry copied decision text so later comment clearing does not rewrite delivered messages. Derive unresolved conflict details from current rules; a suppressed confirmed slot must not immediately be reflagged by a global scan on every read.

Use transactions/concurrency control for capacity, monthly counting, duplicate event participation, replacement, reassignment, cancellation, and cascade restoration. Two simultaneous volunteers must not reserve the last seat. A stale drag/drop action must not silently overwrite a newer replacement. Scheduler overflow increases and slot creation must commit together. Invitation claiming must be idempotent against the invited identity.

Use organization timezone conversions explicitly; server/browser machine timezone must not change event times or monthly membership. Apply soft-deletion filters deliberately in read models; historical references to deleted catalog records must remain renderable where permitted.

## Current code map and implementation gaps

Inspected October 12, 2026; agents must inspect again before editing and preserve unrelated work. `test.md` was untracked at inspection; do not overwrite it.

| Area              | Existing source                                                      | Relevant gap                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database          | `src/server/db/schema.ts`; `drizzle/`                                | Slots/shifts use active/deleted enums; no approved slot lifecycle, expressions, user certification verification, settings, notifications, saved locations, or capability grants in the inspected schema. Existing physical cascade declarations require review.              |
| Authorization     | `src/server/permissions/index.ts`; `src/features/authz/`             | Current CASL logic grants event update to non-Users and shift modification to Administrator/Developer; it does not implement independent Officer capabilities.                                                                                                               |
| Authentication    | `src/server/auth.ts`                                                 | Both required providers exist. Officer/Administrator/Developer currently share Better Auth `adminAc`; replace broad effective access with approved boundaries. Review account linking (`allowDifferentEmails: true`) against invitation matching and verified-email changes. |
| Calendar commands | `src/features/calendar/functions.ts`, `services.ts`, `repository.ts` | Several handlers forward directly to service/repository without visible command-level authorization. Slot assignment grows capacity, but capacity update is not awaited in the inspected service and is not visibly transactional.                                           |
| Deletion          | Calendar repository                                                  | Shift, slot, template-position removals currently call physical `delete`; change to soft deletion.                                                                                                                                                                           |
| Capacity UI       | `src/routes/_authed/calendar/events.$eventId.tsx`                    | Quantity UI clamps to occupancy. Preserve behavior and add server enforcement rather than relying on UI. Update occupancy/state rendering and implement self-service workflows.                                                                                              |
| Templates         | `src/routes/_authed/calendar/templates/`; calendar repository        | Existing one-date copying flow is aligned conceptually; add copied alert thresholds, no live template propagation.                                                                                                                                                           |
| User management   | `src/features/users/`; `src/routes/_authed/admin/users/`             | Add grants, certifications, invitation/bulk workflows and authorization. Profile/history routes include placeholders.                                                                                                                                                        |
| Onboarding        | `src/components/onboarding-dialog.tsx`                               | Enforce required fields and verified-email activation policy; profile labels must remain separate from eligibility.                                                                                                                                                          |
| Visibility        | `src/routes/_authed/`; event loaders and user queries                | Current event routes load user selections under authenticated routes. Add deliberate public projections and restrict profile endpoints independently from roster access.                                                                                                     |

No code in this document is a guarantee that a UI guard already enforces the server rule. Inspect actual handlers, route loaders, Better Auth plugin endpoints, and repository writes before implementing.

## October 17 inspection additions

- Slots have no assignment creation timestamp. UUID defaults do not establish a historical participation-order policy.
- The checked-in schema contains a certification catalog but no user-certification relation or verification state. No live database was inspected.
- Invitations, monthly limits, rechecks, operational notifications, understaffing alerts, and restoration have no existing implementation in the inspected application source.
- Event and template end times are currently nullable, contrary to the updated product design.
- Name/phone validation and onboarding completion currently do not enforce the updated product requirements.

## Eligibility expression representation

Propose a versioned tree with `and`, `or`, certification (exact/descendant-inclusive), and minimum-role nodes, validated server-side. Share one evaluator across signup, scheduler actions, and rechecks; preserve the expression language approved in product-design section 5.

## Deletion provenance

Propose a deletion timestamp, actor, and deletion-operation identifier for cascades. Descendants already deleted retain their original provenance; restore only descendants carrying the root operation identifier. This metadata supports the product restoration boundary without adding a full assignment audit log.

## October 18 timestamp verification

The source-of-truth assignment table `junctionSlotsInCalendar` in `src/server/db/schema.ts`, the generated `drizzle/schema.ts`, the initial migration, and checked-in migration snapshots contain only slot ID, shift ID, user ID, and status. No explicit assignment creation/update timestamp is defined. Slot creation writes shift/user IDs and reassignment updates the user ID; neither writes an assignment timestamp. Slot UUIDs default to `uuid_generate_v7()`; UUID generation time, if recoverable for a particular ID, would describe slot creation and not necessarily the current owner’s assignment time after replacement. A read-only `information_schema.columns` query against the configured live database on October 18 confirmed the same four columns on `calendar.junction_slots` and no timestamps on `calendar.junction_shifts`. Only column metadata was read; no assignment records were read or changed.

## October 18 retained-data audit

A later [aggregate-only inspection for issue #3](audits/2026-10-18-retained-data.md) counted the actual retained-data gaps and audited physical-delete paths in an enforced read-only transaction. It records the required migration decisions and includes reproducible SQL. This later inspection extends the earlier column-only observation; it does not approve a repair policy or change application data.

## October 19 migration baseline

Issue [#36](https://github.com/groneman7/ccru-start/issues/36) introduces a [guarded current-schema baseline and migration procedure](database-migrations.md). A fresh read-only inspection confirmed the configured retained target matches the 12-table/87-column baseline and has no migration ledger; the new command's check mode plans adoption without applying it. Historical migration files remain unchanged. Feature migrations now append under `drizzle/mvp/`; independent authorization/catalog work is not blocked on applying this baseline. Assignment timestamp repair remains owned by #37.

Validation for #36: 20 tests passed across the full suite, including isolated PostgreSQL migration rehearsal and real HTTP application reads/sign-in before and after reconciliation. The configured retained target was checked read-only; no ledger or business rows were written there. Offline migration generation reports no schema changes. Typechecking still reports the same four pre-existing errors from baseline `dbb5565`: unused `pgTable` in the old introspection schema, two template-editor array index-signature errors, and unused `Link` in the developer UI route. ESLint cannot start because the installed typescript-eslint does not support TypeScript 7. No dependency or unrelated application fixes were included.

The standards review reported no actionable findings. The spec review found that disabled internal foreign-key triggers could escape the initial structural comparison. A failing migration-command regression test reproduced the gap; the catalog contract now includes normalized internal trigger enforcement modes and rejects that layout without modifying records or recording adoption. The complete suite passed again after the fix, and a new retained-target read-only check still planned adoption without applying it.

## October 19 authority prerequisite

Issue #4 adds exactly two stored Officer grants, `canManageScheduling` and `canManageUsers`. Administrators and Developers receive both effectively by their existing role; Officers begin with neither stored grant. The forward migration preserves all explicit roles/statuses and rejects missing, unknown, or compound roles instead of inventing replacements. Changing away from Officer clears stored grants, while reselecting the existing role preserves them.

Existing server functions now resolve the actor from a fresh trusted session, independently of client actor IDs/roles/grants. Every Officer can view full profiles and has saved-location authority through the shared policy, regardless of mutation grants. Existing profile, calendar, certification, and authorization entry points use the shared guards. Own profile completion is server-controlled and cannot be asserted through the authentication update endpoint. The user-management page exposes the two independent grant controls and limits role editing to Administrator/Developer, preserving the Developer-only boundary.

Better Auth admin mutations that bypass domain authority—including physical user deletion—are disabled. Full-profile read endpoints remain available to Officers and higher roles; Developer impersonation/session operations remain separate from Officer grants. Registration rollout, verified email-change delivery, scheduling lifecycle/soft deletion and deactivation/session-revocation workflows remain owned by their feature tickets. This prerequisite neither changes retained records nor deploys anything.

Validation for #4: all 41 tests passed, including the role/grant/bypass matrix, grant-control component checks, and role-preserving migration fixtures. Typechecking reports the same four pre-existing errors recorded above. The October 19 aggregate-only retained-target inspection found zero unsupported roles; no authority migration was applied there.

The spec review caught a role-selector guard that also disabled Developers when editing an existing Developer. The corrected shared control has a regression test for that boundary. Invited identities may read/edit their own onboarding profile, while management actions still require an active identity; completion and verification fields remain server-controlled.

The final #4 standards and spec reviews report no remaining actionable findings.

## October 19 assignment-time follow-up

The product owner's October 18 approval resolves the timestamp-repair policy for #37: fill missing historical assignment times from each slot's UUIDv7 timestamp, accepting slot creation as the current-owner priority approximation even where replacement history cannot be recovered. The real historical data has no currently actionable conflicts. This supersedes only the earlier timestamp-policy prerequisite; it does not rewrite the dated audit or exempt historical participation from future monthly counting or explicit rechecks.

The [assignment-time migration and shared write contract](assignment-times.md) adds nullable `assigned_at` without a default, protects fresh/replacement writes before backfill, validates the dedicated UUID decoder, fills only missing values including deleted slots, then requires timestamps. Existing staffing create/reassign operations retain #4's trusted scheduling authority and return the database's authoritative time. Same-event moves preserve priority; cross-event moves and owner changes reset it. State-only updates preserve it. No scheduling lifecycle, review, recheck, confirmation or notification workflow is replayed.

Validation for #37: all 54 tests pass across seven files, including 13 timestamp tests covering retained rows, decoder failures, both concurrent cutover orderings and real staffing commands. The cold-start HTTP authorization check now uses the same 30-second timeout as the other application integration tests. Offline generation reports no schema changes; typechecking still reports only the four pre-existing errors above. ESLint remains blocked by the installed TypeScript 7/tooling mismatch. A final October 19 read-only aggregate check reconfirmed 119/119 valid, finite, correctly decoded UUIDv7 slot timestamps, including 14 deleted slots, zero unsupported roles and no existing `assigned_at` column. No target migration or deployment was performed.

The spec review identified that the fresh-assignment test exercised the lower-level `create` operation rather than the staffing page's `assignUser` operation. The test now exercises the actual UI-triggered operation for both authoritative timestamp output and denied volunteer calls; replacement coverage remains on `reassignUser`.

## October 19 CASL consolidation

The product owner requested one permission vocabulary. `src/server/permissions/index.ts` now defines the shared CASL action/subject rules for both UI and server operations. The separate authority policy and its `hasAuthority`/`requireAuthority` interfaces have been removed. `requirePermission(action, subject)` loads a fresh trusted session, evaluates those same CASL rules, rejects unauthorized calls, and returns the actor and permissions for commands needing additional checks. The canonical role values remain in `src/features/authz/schema.ts`.

CASL conditions express own-profile access and Developer role protection. Status/type changes remain distinct actions from basic profile editing. Role updates retain an atomic database predicate derived from the CASL decision so a concurrent promotion to Developer cannot bypass the restriction. Authentication-plugin guards use the same CASL permissions for profile listing, impersonation and session management. The existing admin navigation checks `list` on `User`; it no longer uses CASL's broad `manage` action on `System`, which could also match Developer-only actions.

The already-applied database schema and grants are unchanged by this refactor. Verification uses the existing isolated server-operation, SSR and UI seams, with additional checks for self-service management escalation, invited cross-profile access and Officer/Administrator/Developer tools visibility.

Validation: all 57 tests pass across seven files. Formatting and diff checks pass; typechecking reports the same four pre-existing errors documented above. The affected React files retain their existing controls and accessibility labels, with permission state derived during rendering. No database or migration files changed.

## October 20 profile and user-type management

Issue #5 replaces the placeholder profile route with current permitted profile/contact details, basic editing and user-type assignment. The existing CASL action/subject rules remain the sole permission vocabulary. Every Officer can view other non-deleted profiles, while user-management authority is required for managing another profile or reusable labels. Own basic-profile access remains available; protected identity, role, grant, lifecycle and verification fields are rejected by the new edit operation. Its display name and supplied phone are normalized server-side. Type names never establish authority or eligibility.

The [profile management and rollout guide](profile-management.md) describes the UI, response projections, nullable deletion metadata and database triggers. Migration `0005_retained_user_types` preserves existing values, excludes only explicitly deleted references from type-deletion blockers, and serializes assignment against soft deletion. Inactive references still block deletion. No profile deletion/restoration workflow or historical snapshot is added. Normal profile/type reads exclude deleted records; the unused authentication-plugin profile-list/get endpoints are disabled to prevent bypassing those filters.

The updated application requires migration 0005 before startup. It has only been rehearsed against disposable PostgreSQL fixtures during this implementation; no retained-target migration, deployment, or real-message delivery is included. Earlier timestamp concurrency fixtures now model their legacy writer at the database compatibility seam rather than starting the newest application against an intentionally old schema; the real current UI commands remain covered against the complete latest sequence.

Validation for #5: all 78 tests pass across ten files, including real authenticated profile/type operations, rendered controls, protected-field and audience denials, migration preservation, repeat execution and both type-assignment/deletion races. The authentication-plugin visibility bypass was reproduced before it was closed. Offline migration generation reports no schema changes. Typechecking still reports only the four pre-existing errors recorded above; lint remains blocked by the existing TypeScript 7/tooling mismatch. Generated router/Drizzle metadata retain their generator formatting.
