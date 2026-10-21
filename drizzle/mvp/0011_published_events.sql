DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM calendar.events WHERE time_begin IS NULL OR time_end IS NULL OR NOT isfinite(time_begin) OR NOT isfinite(time_end) OR time_end<=time_begin OR (time_begin AT TIME ZONE 'America/New_York')::date<>(time_end AT TIME ZONE 'America/New_York')::date) THEN
 RAISE EXCEPTION 'Existing events need explicit time correction; no event end times were inferred';
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "calendar"."events" ALTER COLUMN "time_end" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar"."events" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar"."events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar"."events" ADD CONSTRAINT "event_local_window" CHECK (isfinite("calendar"."events"."time_begin") AND isfinite("calendar"."events"."time_end") AND "calendar"."events"."time_end">"calendar"."events"."time_begin" AND ("calendar"."events"."time_begin" AT TIME ZONE 'America/New_York')::date=("calendar"."events"."time_end" AT TIME ZONE 'America/New_York')::date);