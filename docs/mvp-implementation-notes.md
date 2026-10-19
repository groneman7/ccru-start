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
