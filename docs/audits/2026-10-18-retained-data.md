# Retained-data readiness audit

Issue: [#3 — Audit retained-data readiness for the scheduling MVP](https://github.com/groneman7/ccru-start/issues/3), under [MVP spec #2](https://github.com/groneman7/ccru-start/issues/2).

The inspection is complete. **Monthly enforcement over retained assignments is not ready:** all 119 retained slots lack a recorded current-owner assignment timestamp. The product owner must approve an explicit repair/backfill policy before dependent enforcement. No policy was selected or applied.

User statuses and roles are explicit and recognized, and every retained event/template already has a valid end time. Required profile/contact and activation readiness still need attention: all 157 profiles lack phone numbers, 153 active profiles have unverified email, and 153 active profiles lack completed onboarding. These are separate counts, not a claim that the last two sets are identical. Preserve explicit statuses; do not infer verification or silently reclassify these profiles.

## Scope and method

- Inspected the database configured by the current checkout's `.env.local`; the deployment environment and other database branches were not independently verified. This is not a declaration that every deployed database is ready.
- Authoritative aggregate snapshot: **October 18, 2026, 3:48:44.924 p.m. America/New_York** (`2026-10-18T19:48:44.924Z`). Code baseline: `ec0b9d14edba27243f85249fe167729262b0bcdb`.
- Executed the complete [aggregate SQL](2026-10-18-retained-data.sql) on one connection inside `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, with local statement/lock timeouts, ending in `ROLLBACK`. PostgreSQL reported `transaction_read_only = on` and `transaction_isolation = repeatable read`.
- Counted all rows in the stated categories, not a sample. Inspected visible base-table column metadata across non-system schemas and all corresponding foreign-key declarations. Visibility is limited to the configured database role's accessible metadata.
- Retrieved aggregate counts and schema metadata only. No profile IDs, names, email/phone values, event details, account credentials, session tokens, or connection secrets are included in the report or query results. No mutation endpoint, migration, seed, repair, or deployment was run.
- Followed the [approved design](../mvp-design.md), [domain glossary](../../GLOSSARY.md), and architecture decisions for [current assignment state](../adr/0002-retain-current-assignment-state.md) and [quiet restoration](../adr/0003-quiet-developer-restoration.md).

To reproduce on the inspected schema, execute the complete SQL file on one PostgreSQL connection using the intended database configuration. It enforces read-only mode itself. It is a dated audit of the existing schema, not a migration or a query guaranteed to work unchanged after schema evolution. Re-run against the actual migration target immediately before a retained-data migration; counts may change after this snapshot.

## Aggregate findings

### Users and identities

| Check                                                       |            Count | Interpretation                                                                      |
| ----------------------------------------------------------- | ---------------: | ----------------------------------------------------------------------------------- |
| Profiles                                                    |              157 | Retain identities and relationships                                                 |
| Explicit `active` / `inactive` / `invited`                  |      155 / 2 / 0 | Preserve these values                                                               |
| Missing or unexpected status                                |            0 / 0 | No status-value repair is indicated by this snapshot                                |
| Explicit User / Officer / Administrator / Developer         | 134 / 15 / 7 / 1 | Preserve existing roles                                                             |
| Missing or unrecognized role                                |            0 / 0 | No role-value repair is indicated                                                   |
| Missing first name / last name / email                      |        0 / 0 / 0 | Existing required name/email values are populated                                   |
| Missing or blank phone                                      |              157 | All profiles need a real phone before satisfying the new required-phone rule        |
| Active profiles with unverified email                       |              153 | Do not mark verified from role, status, account presence, or onboarding assumptions |
| Active profiles without onboarding completion               |              153 | Completion cannot be inferred from `active` status                                  |
| Case-insensitive duplicate-email groups / affected profiles |            0 / 0 | No duplicate merge is indicated by this check                                       |

There are no missing/unknown status values to backfill here. The explicit `active` value does not independently establish that the new verified-email/onboarding conditions have been met. Missing phone and incomplete activation evidence are separate readiness gaps, not permission to replace explicit user statuses. Phone formatting/country-code validity could not be assessed because all phone values are missing.

### Events and templates

| Check                                                  | Events |                                   Templates |
| ------------------------------------------------------ | -----: | ------------------------------------------: |
| Total                                                  |     17 |                                           2 |
| Missing start                                          |      0 |                                           0 |
| Missing end                                            |      0 |                                           0 |
| End at/before start                                    |      0 |                                           0 |
| Different start/end calendar dates in America/New_York |      0 | Not applicable to time-only template values |

All 17 retained events have a positive duration on one America/New_York date; both templates have end time later than start time. Zero upcoming events have missing ends. No end-time correction policy is needed for the inspected records. The nullable database/schema definitions still need tightening in their owning feature slices, with fresh validation before migration. Do not infer an end value if later data differs.

### Slots, shifts, and relationships

| Check                                  |          Slots |         Shifts |
| -------------------------------------- | -------------: | -------------: |
| Total retained rows                    |            119 |            118 |
| Legacy `active`                        |            105 |            115 |
| Legacy `deleted`                       |             14 |              3 |
| Missing / unexpected status            |          0 / 0 |          0 / 0 |
| Missing referenced shift / user        |          0 / 0 | Not applicable |
| Missing referenced event / position    | Not applicable |          0 / 0 |
| Active slot beneath a deleted shift    |              0 | Not applicable |
| Nonpositive capacity                   | Not applicable |              0 |
| Duplicate active event/position groups | Not applicable |              0 |

There are 16 template-position associations, with zero duplicate template/position groups. The reference catalog contains 12 positions, 11 user types, and 12 certification definitions, including 9 child-to-parent links.

These checks establish only the listed structural conditions. They do not constitute a full eligibility, monthly-limit, authorization, or production migration validation, and no existing assignments were reevaluated or changed.

### Assignment timestamps

Live `calendar.junction_slots` has exactly `id`, `shift_id`, `user_id`, and `status`. It has no creation/update/current-owner assignment timestamp. Consequently **119 of 119 retained slots, including 105 legacy active and 14 legacy deleted slots, lack recorded current-owner assignment time**. The shift table also has no timestamp from which to establish that assignment priority.

The [calendar repository](../../src/features/calendar/repository.ts) creates a slot with shift/user IDs and reassigns by replacing only its user ID. The [source schema](../../src/server/db/schema.ts), [generated schema](../../drizzle/schema.ts), and checked-in migrations do not provide the missing current-owner timestamp. No ownership-transition history is available in these inspected tables.

UUID v7 generation time, even if recoverable, describes slot creation and cannot establish the current owner's assignment time after replacement. User creation/login/update times, event start, confirmation time, a shared migration timestamp, or arbitrary ordering are not approved substitutes. Do not invent priority or preserve an incumbent's priority for a replacement.

### User-certification verification

The visible metadata contains only the certification catalog (`id`, `name`, `display`, `parent`), not a user-certification relation, verification-state column, or a foreign key representing a user-certification link. The qualification-name/column search returns that same catalog only. No unexpected live user-certification verification records were observed in this visibility scope.

The 12 catalog definitions are **not** evidence of 12 verified qualifications. Creating the future relation must not infer verification from the catalog, system role, user type, or existing assignment. If another target database or later inspection reveals user-certification records, review their provenance/state explicitly before migration.

## Agreed preservation and mapping

| Existing record/category                      | Required handling                                                                                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 105 legacy active slots                       | Map to `confirmed`, retaining IDs, user/shift relationships, and other original business data. Timestamp repair remains a separate prerequisite.                                          |
| 14 legacy deleted slots                       | Keep soft-deleted, retained, and excluded from capacity/monthly participation. Do not revive them during lifecycle migration.                                                             |
| 115 active / 3 deleted shifts                 | Preserve active/deleted meaning and relationships. Do not discard retained deleted parents or infer a historical deletion cascade.                                                        |
| All 157 users                                 | Preserve identity, explicit status, role, and relationships, including the 2 inactive profiles. Missing phone/verification/onboarding evidence does not authorize rewriting those values. |
| Events, templates, catalogs, and associations | Preserve original records and existing valid times/references. No end-time default or qualification verification is required or inferred.                                                 |

Legacy deletion enums do not record deletion time, actor, or root-operation provenance. New cascade metadata must distinguish future operations; it cannot honestly reconstruct which legacy descendants were deleted together. Preserve existing deleted markers, and require explicit handling of any legacy recovery ambiguity rather than silently assigning common cascade provenance.

## Required decisions and migration gates

The audit is complete independently of these downstream decisions. **No new business behavior or repair policy is approved by this report.**

| Gate                                | Finding and required next action                                                                                                                                                                                                                                                                                                                                                            | Work affected                                                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assignment-time repair              | Product owner must explicitly approve how to repair the 119 retained current-owner assignment times, or how unresolved records are handled before enforcement. Record the decision before dependent behavior is enabled; no UUID/shared-time/fallback order is approved.                                                                                                                    | [#15 assignments](https://github.com/groneman7/ccru-start/issues/15) when introducing retained assignment timestamps; [#17 monthly limits](https://github.com/groneman7/ccru-start/issues/17) before enforcement and dependent scheduling flows |
| Retained-profile onboarding rollout | Establish how the 157 missing phones will be obtained and how retained unverified/incomplete active profiles will complete the approved requirements while preserving explicit statuses/roles. Do not fabricate contact values, mark verification complete, or silently downgrade/grandfather users. This is a rollout/repair decision, not an unresolved choice about required MVP fields. | [#6 registration/onboarding](https://github.com/groneman7/ccru-start/issues/6) before affected retained-profile enforcement; later profile/sign-in workflows                                                                                    |
| Future schema/data drift            | Re-run these aggregate checks on the actual target before migration. If missing/ambiguous status, end times, or unexpected verification data appears, obtain explicit correction/review rather than inventing values.                                                                                                                                                                       | Only the relevant retained-data migration                                                                                                                                                                                                       |
| Legacy recovery provenance          | Original deleted rows have no root-operation metadata. Preserve their deleted status and do not claim a reconstructed deletion history; settle any ambiguous legacy recovery handling before restoring such cascades.                                                                                                                                                                       | Recovery slices when dealing with legacy deleted records, not new cascades with recorded provenance                                                                                                                                             |

There is no current end-time, missing-status, missing-role, duplicate-email, or unexpected user-certification-data repair indicated by the inspected snapshot. Authorization/grants, catalog work, and new workflows that do not depend on unresolved retained-data handling can proceed. This report does not authorize production migrations, data mutation, or deployment, and it does not impose a global implementation hold.

## Physical-delete audit

The following are observations at the code baseline, not changes made by this ticket.

### Application and authentication entry points

| Path                                                                                             | Observed behavior                                                                                                                                                                               | Required owner/follow-up                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shiftRepository.delete` in the [calendar repository](../../src/features/calendar/repository.ts) | Physically deletes a shift; its live FK cascades to slots. Exposed through server function/service and UI mutation.                                                                             | [#26 shift/event deletion](https://github.com/groneman7/ccru-start/issues/26): use domain checks, atomic soft deletion, retained descendants and cascade provenance, and required volunteer messages.                                                                                                                                                                          |
| `slotRepository.delete` in the same repository                                                   | Physically deletes the assignment, losing retained owner/state. Exposed through server function/service and UI mutation.                                                                        | [#20 scheduler removal](https://github.com/groneman7/ccru-start/issues/20), [#22 withdrawal](https://github.com/groneman7/ccru-start/issues/22), and #26: replace with the shared soft-delete command and participation/review side effects.                                                                                                                                   |
| `templateRepository.deleteTemplatePosition` in the same repository                               | Physically deletes a template-position association.                                                                                                                                             | [#29 templates](https://github.com/groneman7/ccru-start/issues/29) / [#30 reference deletion](https://github.com/groneman7/ccru-start/issues/30): retain the association and validate live references/provenance.                                                                                                                                                              |
| Better Auth admin `POST /admin/remove-user`                                                      | The configured admin plugin exposes the installed library's destructive user removal path. Installed Better Auth 1.6.25 deletes sessions, accounts, then the user through its internal adapter. | [#4 authorization](https://github.com/groneman7/ccru-start/issues/4), [#31 deactivation](https://github.com/groneman7/ccru-start/issues/31), and [#33 profile recovery](https://github.com/groneman7/ccru-start/issues/33): close/bypass-proof physical profile deletion and use approved retained lifecycle commands. Do not rely on whether the UI presents a delete button. |
| Better Auth own-user deletion                                                                    | The installed core `/delete-user` endpoint checks `user.deleteUser.enabled`; the application does not enable it. It is not a currently enabled self-deletion workflow.                          | Preserve that boundary; do not enable irreversible domain deletion while adding profile management.                                                                                                                                                                                                                                                                            |

The [auth configuration](../../src/server/auth.ts) maps Officer, Administrator, and Developer to Better Auth `adminAc`, which includes user deletion permission. The [auth API route](../../src/routes/api/auth/$.ts) forwards GET/POST to the handler. The removal implementation and permission were inspected in the installed library; **no deletion endpoint was called**. Session revocation/expired-token cleanup is an approved retention exception; deleting a retained domain profile and its identity accounts is not covered by that exception.

No additional application SQL `DELETE`, `TRUNCATE`, or `DROP TABLE` statements were found in the inspected source/migrations. No event, position, certification, or user-type physical-delete repository method was found. This does not make direct SQL or library-managed deletion safe; future commands still need explicit domain checks.

### Live foreign-key effects

The live FK metadata matches the current source declarations for these effects:

| Referenced record deleted                                                              | Effect on dependent rows                                         | Retention implication                                                                                                    |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Event                                                                                  | Cascade-delete shifts; shift deletion then cascade-deletes slots | Physical parent deletion can destroy the retained scheduling tree.                                                       |
| Position                                                                               | Cascade-delete shifts, then slots                                | Historical references do not protect assignments from this cascade.                                                      |
| Shift                                                                                  | Cascade-delete slots                                             | Replacing only the direct slot delete path is insufficient.                                                              |
| User referenced by slot                                                                | `SET NULL` on `user_id`, although that column is `NOT NULL`      | Deleting such a referenced user can fail; this is not a domain-retention policy and does not protect unreferenced users. |
| User referenced by session                                                             | Cascade-delete sessions                                          | Credential/session cleanup may be physical under the explicit authentication exception; retain the domain user.          |
| User type referenced by user                                                           | `RESTRICT`                                                       | Later soft-deletion checks must use approved live-reference rules.                                                       |
| Template/position referenced by template-position; certification parent; event creator | Default `NO ACTION`                                              | These constraints retain references but do not implement future-only/live-only product deletion rules.                   |

Replace destructive domain operations rather than merely trusting foreign keys. Preserve permitted historical joins, enforce entity-specific restrictions, and do not use blanket historical FK retention as a reason to block every deletion. Quiet restoration must reject structural failures and restore only known cascade descendants; it must not replay scheduling or notifications.

### Migration-history reconciliation

The checked-in initial migration is not a complete reconstruction of the inspected live schema. Examples: it declares event location as text and event start nullable, while the live/source definitions use JSONB and a required start; it declares user `display_name`/`system_role_id`, while the live/source definitions use `display`/`role`; certification parent is present live but absent in the initial migration. The second checked-in migration only adds ban fields.

The schema-migration owner must reconcile the actual target schema with generated/current definitions before producing a retained-data migration. Do not replay or blindly push the initial schema over retained records. This is a technical migration prerequisite, not permission to reset the database or discard existing rows.

## Validation

- The complete committed SQL executed successfully in the enforced read-only repeatable-read transaction and returned the reported aggregate categories; metadata confirmed 87 visible columns and 10 foreign keys.
- Cross-checked slot timestamp absence, write/reassignment behavior, the three application physical-delete methods, live FK effects, checked-in migrations, and installed authentication delete handlers against source.
- No application behavior changed, so no TDD feature tests or fixture writes against this database were appropriate. The aggregate SQL execution is the direct verification for this inspection.
- The initial `pnpm exec tsc --noEmit` run reported four errors: unused `pgTable` in the generated schema, two undefined-array index-signature errors in the template editor, and unused `Link` in the developer UI route. The final run after Vitest initialization reported those four plus three auth API route typing errors (`server` option and two untyped `request` bindings). No tracked TypeScript or configuration files changed in this audit; typechecking is not passing and these unrelated errors remain unresolved.
- The full `pnpm test` command ran once and exited 1 because Vitest found no test files. It did not run application test cases or fixture writes. Markdown formatting and `git diff --check` passed.
