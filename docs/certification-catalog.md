# Hierarchical certification catalog

Issue [#10](https://github.com/groneman7/ccru-start/issues/10) keeps training levels, organizational training and specialties in the existing certification hierarchy. No additional eligibility dimension, effective date or expiration date is introduced.

The catalog at `/admin/certifications` shows current display names in its tree and parent labels. User managers can create, rename, reparent, clear a parent and soft-delete definitions. Ordinary catalog readers receive no mutation controls; direct operations use the same CASL rules. The existing create/update operations retain their interfaces, with trimmed nonempty labels, valid parent IDs and strict rejection of unsupported fields. Renames keep the certification ID, so child references continue resolving the current label.

The editor excludes itself and descendants from parent choices, resets drafts when the selected definition changes, disables controls during writes and displays server errors. Server/database validation also rejects self-parenting, longer cycles, nonexistent parents and deleted parents. Normal list and detail reads exclude deleted definitions, including direct requests to deleted IDs. Selection queries and detail queries are invalidated after edits; deleting returns to the catalog.

## Retention and concurrency

Migration `0007_retained_certification_catalog` adds a nullable `deleted_at` marker without changing existing values. A live child blocks parent soft deletion; a deleted child retains its original parent reference and no longer blocks deletion. Restoring a child under a deleted parent fails the structural integrity guard. Physical deletion is rejected, including for retained deleted records. A catalog soft-delete marker does not add a restoration workflow; Developer restoration remains owned by its later slice.

The only existing foreign-key reference to the catalog is its own parent relationship, confirmed by the October 21 read-only retained-target inspection. User-certification relations and eligibility-expression references are not present yet. Their slices must add their live-reference guards when introducing those references; this feature does not pretend those relations already exist.

A transaction advisory lock shared by catalog mutations serializes edits to different hierarchy rows. Validation queries use fresh Read Committed snapshots after acquiring the lock. Mutation attempts at other transaction isolation levels fail explicitly rather than risk stale graph validation; the application's existing Neon HTTP operations use Read Committed. No parent row lock is taken after the shared lock, avoiding reversed row/advisory-lock dependencies for concurrent reparenting. Tests coordinate competing writes while the first transaction remains open and verify that cycles and parent-deletion/child-creation races have one valid outcome.

## Migration and rollout

Apply migration 0007 **before starting this application version**, using the [guarded migration procedure](database-migrations.md) and a fresh recoverable backup. Applying to the retained target requires separate authorization. No migration, deployment or real outbound message is included in implementation verification.

The migration rejects a pre-existing cycle without changing its records or recording the migration; reconciliation requires an explicit policy. The October 21 aggregate-only retained-target preflight found 12 definitions, no cycles and no missing parents. No target values were changed. Earlier migrations and snapshots remain immutable.

Isolated tests cover all thirteen pre-existing tables, repeat application, rollback on invalid retained hierarchy, retained deleted-child references, physical-deletion rejection and concurrent graph/reference edits. Real auth/RPC/SSR checks cover authorized and unauthorized management, stable rename identity, reparenting, current labels and deleted selections. Pure component tests exercise actual controls, selected parents, blocked deletion and draft reset through public callbacks. The earlier registration migration's preservation projection excludes only this later certification deletion column; this feature's migration test separately verifies it begins null.
