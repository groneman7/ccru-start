# Database migration baseline

Issue [#36](https://github.com/groneman7/ccru-start/issues/36) establishes a migration sequence for the current application schema. It does not perform the assignment timestamp backfill, change slot states, tighten event end times, or complete profile onboarding. Those belong to their feature tickets.

## Why a new baseline

The October 19, 2026 inspection of the database configured by this checkout confirmed PostgreSQL 17.11, 12 application tables, 87 columns, and no migration ledger. Its schema matches the current application definitions. The UUID generator is supplied by the installed `pg_uuidv7` extension in `public`.

The original `drizzle/0000_spooky_wendigo.sql` and `0001_legal_magik.sql` describe a different schema: `display_name`/`system_role_id`, text event/template locations, nullable event start, and no certification parent. Their SQL and metadata remain unchanged as historical artifacts. They are not replayed, rewritten, or marked applied on the retained target.

The active sequence is `drizzle/mvp/`, generated from `src/server/db/schema.ts`. Its first migration creates the current schema. `scripts/db/baseline.json` holds that migration's SHA-256 and structural catalog, captured from a fresh PostgreSQL 17 fixture. It contains metadata only, not retained records. This immutable contract is for adopting this particular baseline; later feature migrations must not regenerate it.

The new ledger, `_drizzle._mvp_migrations`, records only this new sequence. On an already-current database, adopting the baseline means verifying that its effects are already present and recording its own hash. It makes no assertion that the incompatible historical migrations ran.

## Plan and apply

Migration tooling does not load `.env` or `.env.local`. Set `MIGRATION_DATABASE_URL` explicitly to the intended target in your shell or secret manager. Do not put credentials in committed commands, screenshots, or logs.

```sh
pnpm db:migrate --check
```

The default `pnpm db:migrate` is also read-only. Plans report an action and pending migration tags:

| Action    | Meaning                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `create`  | Application schemas are empty; the baseline will create them.                                                             |
| `adopt`   | The existing schema exactly matches the baseline, without recorded new history. Only the baseline ledger entry is needed. |
| `migrate` | The new ledger is valid and later migrations are pending.                                                                 |
| `none`    | The checked-in sequence is already recorded.                                                                              |

Check mode runs in a PostgreSQL read-only transaction and creates no ledger. The October 19 retained-target check returned `adopt`, `applied: false`, with only `0000_current_baseline` pending. **No retained-target adoption or migration was executed.** This is an inspection of the configured database, not every deployment or database branch.

Before any authorized application, independently confirm the target identity, take a recoverable database backup, rerun the retained-data checks for the affected feature, and rehearse against an isolated copy or representative fixtures. Stop concurrent schema tooling; runners using this command serialize with a transaction advisory lock. Ordinary application data writes do not change during baseline adoption because it writes no business rows. Do not run `drizzle-kit migrate` directly: it bypasses the adoption, schema, and ledger guards.

```sh
# Only for an explicitly selected, authorized target after rehearsal:
pnpm db:migrate --apply
```

Application and ledger updates share one transaction. A failed statement rolls back both, and a retry rereads the ledger. Lock and statement timeouts bound waiting. UUID generation must already be provisioned as `public.uuid_generate_v7()` and return UUIDv7; this command does not install extensions or replace the generator. Empty database means empty application schemas, with that prerequisite available.

Before adoption, or when the recorded sequence contains only the baseline, the command compares relations, column types/nullability/defaults/identity/collation, enum values, validated constraints, indexes, triggers, row-security flags, and policies. Physical column order and owners are not part of that comparison. Extra application objects, the incompatible original layout, or another migration ledger cause rejection. No role, location, timestamp, or required-value conversion is guessed. An existing canonical ledger must have the expected columns and an exact ordered hash/time prefix of the checked-in journal. Unknown or edited history is rejected.

After later migrations have been recorded, the runner verifies ledger integrity rather than comparing the evolved schema to the old baseline. Review actual target metadata and data prerequisites before each later migration; this command is not a universal schema-drift repair tool. Future migrations must include any feature-specific preconditions and validation they need. The baseline does not validate future business requirements, repair audit findings, or make current physical-delete paths safe.

## Later feature migrations

1. Edit the application schema within the owning feature ticket.
2. Run `pnpm db:generate`. Generation works offline and compares against the new sequence's latest snapshot. A consistency run after establishing this baseline reported no schema changes.
3. Review the generated SQL and snapshot. Append migrations; never modify the recorded baseline or earlier applied entries. If custom data migration SQL is needed, use Drizzle's custom migration support. Keep transaction control in the runner: migrations must not contain `BEGIN`, `COMMIT`, `ROLLBACK`, or operations that cannot run in its transaction.
4. Rehearse the complete sequence on an empty fixture and on a baseline/retained fixture. Validate identities, roles/statuses, associations, and the affected application operations before/after. Missing required data needs the explicit policy owned by that feature; it must not be hidden by defaults.
5. Run check mode against the intended target immediately before separately authorized execution. For packaged migration artifacts, `--migrations <directory>` selects another complete sequence; it must still contain the identical pinned baseline and a strictly increasing journal.

`db:push` is disabled to prevent bypassing retained-history reconciliation. Introspection uses `pnpm db:pull`, writing to `drizzle/introspection/` rather than the active migration snapshots. It and Studio also require an explicit `MIGRATION_DATABASE_URL`. Review introspection output; it is not a replacement for the application schema or permission to overwrite migration history.

[Drizzle generation documentation](https://orm.drizzle.team/docs/drizzle-kit-generate) describes SQL/snapshot generation and custom migrations. Application remains on the existing Drizzle/Neon stack; the operational migration command uses the existing `pg` dependency for a single transactional connection.

## Rehearsal and recovery

The integration tests create and remove their own temporary local PostgreSQL cluster. They never use application environment files for fixture connections. PostgreSQL 17 tools (`initdb`, `pg_ctl`, `pg_config`) must be installed and local TCP binding permitted. Set `PG_BIN` to the PostgreSQL binary directory if `pg_config` is not on PATH. The test UUID generator replaces only randomness; the retained target's real C extension was inspected separately. No extension is installed into the developer's PostgreSQL installation by tests.

```sh
pnpm test tests/migrations.test.ts
pnpm test tests/migration-flows.test.ts
```

Coverage includes empty initialization, exact adoption, unchanged values across all 12 synthetic tables, repeat execution, drift/history rejection, later migrations, transaction rollback, and simultaneous runners. Real HTTP checks exercise password sign-in, unchanged session/user identity, profile reads, and event/staffing pages on fresh and retained layouts. Only Neon's external HTTP transport is redirected to local PostgreSQL; application SQL, server functions and auth handlers are real. External telemetry is disabled; no real providers or people are contacted.

If rehearsal fails, keep the error, review the schema/ledger metadata, and fix the proposed forward migration or obtain the needed data policy. Rerun from an untouched fixture/copy. A rolled-back failure should leave both business records and the ledger unchanged. Do not delete ledger rows, reset retained schemas, rewrite old migration hashes, or use a schema push to silence a mismatch. Unknown layouts and pre-existing historical ledgers need a separately reviewed transition, not this automatic adoption path.

After a committed migration, recovery is a reviewed compensating forward migration or restoration of the verified backup according to the target's operational procedure. It is not a blind rerun of archived SQL. A successful rehearsal or implementation of this ticket does not authorize production execution or deployment.
