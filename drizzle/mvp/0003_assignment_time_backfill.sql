-- Approved October 18, 2026: UUIDv7 creation time is the MVP approximation
-- for missing legacy current-owner priority, including retained deleted slots.
-- No domain commands or workflow replay occur during this repair.
LOCK TABLE calendar.junction_slots IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regprocedure('public.uuid_v7_to_timestamptz(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Assignment backfill requires the validated pg_uuidv7 dedicated timestamp helper';
  END IF;
  IF public.uuid_v7_to_timestamptz('017f22e2-79b0-7cc3-98c4-dc0c0c07398f'::uuid)
       IS DISTINCT FROM timestamptz '2022-02-22 19:22:22+00'
     OR public.uuid_v7_to_timestamptz('018570bb-4a7d-7c7e-8df4-6d47afd8c8fc'::uuid)
       IS DISTINCT FROM timestamptz '2023-01-02 04:26:40.637+00' THEN
    RAISE EXCEPTION 'Assignment backfill decoder failed the published UUIDv7 timestamp vectors';
  END IF;
  IF EXISTS (
    SELECT 1 FROM calendar.junction_slots
    WHERE assigned_at IS NULL
      AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Assignment backfill found a missing legacy timestamp with an unsupported UUID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM calendar.junction_slots
    WHERE assigned_at IS NULL AND (
      public.uuid_v7_to_timestamptz(id) IS NULL
      OR NOT isfinite(public.uuid_v7_to_timestamptz(id))
      OR public.uuid_v7_to_timestamptz(id) IS DISTINCT FROM
        to_timestamp((('x' || substr(replace(id::text, '-', ''), 1, 12))::bit(48)::bigint)::double precision / 1000)
    )
  ) THEN
    RAISE EXCEPTION 'Assignment backfill found an unextractable or incorrect UUIDv7 timestamp';
  END IF;
END $$;
--> statement-breakpoint
UPDATE calendar.junction_slots
SET assigned_at = public.uuid_v7_to_timestamptz(id)
WHERE assigned_at IS NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM calendar.junction_slots WHERE assigned_at IS NULL OR NOT isfinite(assigned_at)) THEN
    RAISE EXCEPTION 'Assignment backfill left missing or non-finite timestamps';
  END IF;
END $$;
