-- Issue #3: aggregate-only inspection of the configured database.
-- Execute the complete file on one connection. No row identities or credentials
-- are returned. READ ONLY is enforced by PostgreSQL; ROLLBACK ends the snapshot.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

SELECT 'snapshot' AS section,
       transaction_timestamp() AS captured_at,
       current_setting('transaction_read_only') AS read_only,
       current_setting('transaction_isolation') AS isolation;

SELECT 'columns' AS section, c.table_schema, c.table_name, c.column_name,
       c.data_type, c.is_nullable
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema <> 'information_schema'
  AND c.table_schema NOT LIKE 'pg\_%' ESCAPE '\'
  AND t.table_type = 'BASE TABLE'
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

SELECT 'foreign_keys' AS section, ns.nspname AS table_schema,
       src.relname AS table_name, con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = src.relnamespace
WHERE con.contype = 'f'
  AND ns.nspname <> 'information_schema'
  AND ns.nspname NOT LIKE 'pg\_%' ESCAPE '\'
ORDER BY ns.nspname, src.relname, con.conname;

SELECT 'users' AS section,
       count(*)::int AS total,
       count(*) FILTER (WHERE status IS NULL)::int AS status_missing,
       count(*) FILTER (WHERE status::text = 'active')::int AS status_active,
       count(*) FILTER (WHERE status::text = 'inactive')::int AS status_inactive,
       count(*) FILTER (WHERE status::text = 'invited')::int AS status_invited,
       count(*) FILTER (WHERE status IS NOT NULL AND status::text NOT IN ('active', 'inactive', 'invited'))::int AS status_unexpected,
       count(*) FILTER (WHERE role IS NULL OR btrim(role) = '')::int AS role_missing,
       count(*) FILTER (WHERE role = 'User')::int AS role_user,
       count(*) FILTER (WHERE role = 'Officer')::int AS role_officer,
       count(*) FILTER (WHERE role = 'Administrator')::int AS role_administrator,
       count(*) FILTER (WHERE role = 'Developer')::int AS role_developer,
       count(*) FILTER (WHERE role IS NOT NULL AND btrim(role) <> '' AND role NOT IN ('User', 'Officer', 'Administrator', 'Developer'))::int AS role_unexpected,
       count(*) FILTER (WHERE name_first IS NULL OR btrim(name_first) = '')::int AS first_name_missing,
       count(*) FILTER (WHERE name_last IS NULL OR btrim(name_last) = '')::int AS last_name_missing,
       count(*) FILTER (WHERE email IS NULL OR btrim(email) = '')::int AS email_missing,
       count(*) FILTER (WHERE phone_number IS NULL OR btrim(phone_number) = '')::int AS phone_missing,
       count(*) FILTER (WHERE status::text = 'active' AND email_verified IS NOT TRUE)::int AS active_email_unverified,
       count(*) FILTER (WHERE status::text = 'active' AND timestamp_onboarding_completed IS NULL)::int AS active_onboarding_incomplete
FROM "better-auth"."user";

SELECT 'case_insensitive_email_duplicates' AS section,
       count(*)::int AS groups,
       coalesce(sum(n), 0)::int AS affected_profiles
FROM (
  SELECT count(*) AS n
  FROM "better-auth"."user"
  GROUP BY lower(email)
  HAVING count(*) > 1
) duplicate_groups;

SELECT 'events' AS section,
       count(*)::int AS total,
       count(*) FILTER (WHERE time_begin IS NULL)::int AS start_missing,
       count(*) FILTER (WHERE time_end IS NULL)::int AS end_missing,
       count(*) FILTER (WHERE time_end IS NULL AND time_begin > transaction_timestamp())::int AS upcoming_end_missing,
       count(*) FILTER (WHERE time_begin IS NOT NULL AND time_end IS NOT NULL AND time_end <= time_begin)::int AS nonpositive_duration,
       count(*) FILTER (WHERE time_begin IS NOT NULL AND time_end IS NOT NULL AND (time_begin AT TIME ZONE 'America/New_York')::date <> (time_end AT TIME ZONE 'America/New_York')::date)::int AS different_local_dates
FROM calendar.events;

SELECT 'templates' AS section,
       count(*)::int AS total,
       count(*) FILTER (WHERE time_begin IS NULL)::int AS start_missing,
       count(*) FILTER (WHERE time_end IS NULL)::int AS end_missing,
       count(*) FILTER (WHERE time_begin IS NOT NULL AND time_end IS NOT NULL AND time_end <= time_begin)::int AS nonpositive_duration
FROM calendar.templates;

SELECT 'slots' AS section,
       count(*)::int AS total,
       count(*) FILTER (WHERE status::text = 'active')::int AS status_active,
       count(*) FILTER (WHERE status::text = 'deleted')::int AS status_deleted,
       count(*) FILTER (WHERE status IS NULL)::int AS status_missing,
       count(*) FILTER (WHERE status IS NOT NULL AND status::text NOT IN ('active', 'deleted'))::int AS status_unexpected,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM calendar.junction_shifts s WHERE s.id = a.shift_id))::int AS missing_shift_reference,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "better-auth"."user" u WHERE u.id = a.user_id))::int AS missing_user_reference,
       count(*) FILTER (WHERE status::text = 'active' AND EXISTS (SELECT 1 FROM calendar.junction_shifts s WHERE s.id = a.shift_id AND s.status::text = 'deleted'))::int AS active_under_deleted_shift
FROM calendar.junction_slots a;

SELECT 'shifts' AS section,
       count(*)::int AS total,
       count(*) FILTER (WHERE status::text = 'active')::int AS status_active,
       count(*) FILTER (WHERE status::text = 'deleted')::int AS status_deleted,
       count(*) FILTER (WHERE status IS NULL)::int AS status_missing,
       count(*) FILTER (WHERE status IS NOT NULL AND status::text NOT IN ('active', 'deleted'))::int AS status_unexpected,
       count(*) FILTER (WHERE quantity < 1)::int AS nonpositive_capacity,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM calendar.events e WHERE e.id = s.event_id))::int AS missing_event_reference,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM calendar.positions p WHERE p.id = s.position_id))::int AS missing_position_reference
FROM calendar.junction_shifts s;

SELECT 'active_shift_position_duplicates' AS section,
       count(*)::int AS groups, coalesce(sum(n), 0)::int AS affected_shifts
FROM (
  SELECT count(*) AS n FROM calendar.junction_shifts
  WHERE status::text = 'active'
  GROUP BY event_id, position_id HAVING count(*) > 1
) duplicate_groups;

SELECT 'template_position_duplicates' AS section,
       count(*)::int AS groups, coalesce(sum(n), 0)::int AS affected_associations
FROM (
  SELECT count(*) AS n FROM calendar.junction_template_positions
  GROUP BY template_id, position_id HAVING count(*) > 1
) duplicate_groups;

SELECT 'reference_counts' AS section,
       (SELECT count(*)::int FROM authz.certifications) AS catalog_certifications,
       (SELECT count(*)::int FROM authz.certifications WHERE parent IS NOT NULL) AS catalog_parent_links,
       (SELECT count(*)::int FROM authz.user_types) AS user_types,
       (SELECT count(*)::int FROM calendar.positions) AS positions,
       (SELECT count(*)::int FROM calendar.junction_template_positions) AS template_positions;

-- Find unexpected qualification-bearing tables/columns in all visible
-- application schemas, without selecting any values from those records.
SELECT 'qualification_relation_candidates' AS section,
       table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_schema <> 'information_schema'
  AND table_schema NOT LIKE 'pg\_%' ESCAPE '\'
  AND (table_name ~* '(cert|qualif|credential)' OR column_name ~* '(cert|qualif)')
ORDER BY table_schema, table_name, ordinal_position;

ROLLBACK;
