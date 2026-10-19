# Assignment time and legacy priority

Issue [#37](https://github.com/groneman7/ccru-start/issues/37) records the current owner's assignment time in `calendar.junction_slots.assigned_at` (`timestamptz`; application field `assignedAt`). The October 18 product-owner approval accepts UUIDv7 slot creation time as the approximation for missing historical current-owner priority. It does not reconstruct replacement history. See the dated follow-up in [MVP design](mvp-design.md#october-18-2026-approved-assignment-time-follow-up).

## Authoritative write contract

The existing staffing page calls the same `slotServerFns.assignUser` and `reassignUser` operations. Both require the fresh trusted scheduling authority established by #4, accept no caller timestamp, and return `{ id, assignedAt }` from the committed database write. The lower-level `slotServerFns.create` operation returns the same authoritative data. Unknown input fields cannot select assignment priority.

A database trigger installed with the expansion enforces the contract for application writers, including an older writer running during rollout:

| Write                                                 | Assignment time                                   |
| ----------------------------------------------------- | ------------------------------------------------- |
| Insert a new slot                                     | Database operation time (`clock_timestamp()`)     |
| Change `user_id`                                      | New operation time, even if position also changes |
| Same owner, change `shift_id` within the same event   | Preserve the original value                       |
| Same owner, change `shift_id` to another event        | New operation time                                |
| Repeat an unchanged owner/shift                       | Preserve the original value                       |
| Change only assignment state, delete/restore metadata | Preserve the original value                       |

Later move/replacement commands must update `user_id`/`shift_id` on the existing slot and use `RETURNING assigned_at`; they must not carry a client timestamp into a new assignment. Event membership comes from the referenced shift. These commands must retain their own authorization, transaction, capacity and lifecycle rules. This ticket adds no movement UI or lifecycle transitions. Timestamp-only SQL is reserved for controlled migration/repair, including this backfill; there is no application endpoint for it. Restoration retains the original slot rather than inserting a replacement row.

## Migration stages

The immutable #36 baseline and #4 authority migration precede these appended stages:

1. `0002_assignment_time_expand`: add a nullable timestamp **without a default**, leaving historical rows missing. Install the trigger in the same transaction, so later inserts/replacements already capture accurate operation times.
2. `0003_assignment_time_backfill`: lock slots against concurrent writes; require the dedicated `public.uuid_v7_to_timestamptz(uuid)` helper; verify published timestamp vectors, UUID version/variant and every missing value's extraction. Fill only `assigned_at IS NULL`, including deleted slots. Reject null, non-finite or incorrect decoded times; never substitute migration time. Validate the completed result.
3. `0004_assignment_time_required`: enforce `NOT NULL` and the operation-time default. The trigger continues to enforce replacement/movement behavior.

The [guarded runner](database-migrations.md) applies all pending stages and ledger records in one transaction by default. Writes wait behind the expansion/backfill locks and resume under the trigger. A writer ahead of the backfill records a time that the backfill preserves; a writer behind it replaces the legacy priority with the new operation time. Failure or the runner's lock timeout rolls all pending changes back. A busy target may need a quieter execution window; do not remove the locks or use a fallback timestamp.

A deliberately staged rollout can package a complete sequence ending at `0002` and apply it using `--migrations <directory>`, deploy the compatible application, then apply the full checked-in sequence. The package must retain the identical baseline and preceding migration hashes/journal entries; never edit the repository's applied migrations. Existing timestamps remain nullable until the final stage. The tests rehearse both a combined transaction and this expansion-then-backfill sequence.

## Target checks and execution

On October 19, a repeatable-read, read-only aggregate inspection of the configured retained target found 119 slots, including 14 deleted slots, all UUIDv7. The installed dedicated decoder returned finite timestamps for all 119 and matched the RFC 9562 first-48-bit millisecond interpretation for every value. No `assigned_at` column was present. The generic timestamp-extraction function had returned null in the earlier audit; it is not used here. No retained row, migration ledger or schema was changed by this inspection.

Before separately authorized execution, select the target explicitly, obtain a recoverable backup, and rerun these checks in a read-only transaction on that target. `db:migrate --check` reports pending tags and validates baseline/history; it does **not** execute the feature's decoder/data preconditions. Check helper availability first, then aggregate UUID version/variant, finite extraction and agreement with the UUID's first 48 bits. The migration repeats those validations under its write lock for missing legacy values. A missing extension/helper needs separately managed provisioning; this migration does not install or replace it.

The independent decoder vectors are [RFC 9562, appendix A.6](https://www.rfc-editor.org/rfc/rfc9562.html#appendix-A.6), `017f22e2-79b0-7cc3-98c4-dc0c0c07398f` → `2022-02-22T19:22:22.000Z`, and the [pg_uuidv7 example](https://github.com/fboulnois/pg_uuidv7), `018570bb-4a7d-7c7e-8df4-6d47afd8c8fc` → `2023-01-02T04:26:40.637Z`.

This backfill updates only timestamps and never invokes scheduling services. It performs no rechecks, conflict/review creation, automatic confirmation, notification delivery or historical workflow replay. It preserves all explicit roles/statuses, owners, IDs, relationships and deleted slots. Historical records still participate in ordinary monthly counting and later explicit rechecks when those features are implemented. The [dated audit](audits/2026-10-18-retained-data.md) remains a historical snapshot.

## Rehearsal

```sh
pnpm test tests/assignment-times.test.ts
```

Tests own disposable PostgreSQL clusters and use synthetic retained data. Only the external Neon transport and UUID extension boundary are substituted; real application/auth handlers and SQL execute. Coverage includes published UUID vectors, all 12 business tables preserved with 14 deleted slots, old-writer compatibility, populated timestamps, both concurrent cutover orderings, invalid extraction rollback, final constraints, movement/state preservation, and the existing UI-triggered create/reassign server-operation seam. Command results verify authoritative times and denied volunteer writes. Lock inspection coordinates concurrency; it is not the source of timestamp assertions. No production migration, deployment or real message delivery is part of this rehearsal.
