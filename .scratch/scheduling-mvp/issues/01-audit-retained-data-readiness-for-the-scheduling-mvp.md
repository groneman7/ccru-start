## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

A read-only readiness report identifying exactly which retained records need an approved repair policy before affected schema changes or monthly enforcement can proceed.

Parent user stories covered: 114, 115.

## Acceptance criteria

- [ ] Inspect the actual records that must be retained, using read-only access, and report counts/categories of missing or ambiguous user statuses, missing event/template end times, missing current-owner assignment timestamps, and any unexpected user-certification verification data. Do not expose personal data in the report.
- [ ] Document the agreed legacy active-slot to confirmed and deleted-slot to soft-deleted mappings, preserving identity, roles, explicit statuses, users, and relationships.
- [ ] Distinguish slot creation from the current owner's assignment time; do not infer priority from UUIDs, a shared migration timestamp, or another unapproved fallback.
- [ ] Produce an actionable migration-readiness result, including the specific product-owner decisions needed if incomplete retained data exists. Inspection is complete when these findings are recorded; approval of any repair policy remains an explicit prerequisite for the affected downstream migration.
- [ ] Audit physical-delete operations and cascading declarations so the relevant workflow tickets can replace them without silently losing domain records.
- [ ] Do not mutate records, run production migrations, or deploy. If live read access is unavailable, report that limitation rather than claiming the retained-data prerequisite is resolved; unrelated implementation can proceed.

## Blocked by

None (can start immediately).
