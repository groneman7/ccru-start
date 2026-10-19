ALTER TABLE "calendar"."junction_slots" ADD COLUMN "assigned_at" timestamp with time zone;
--> statement-breakpoint
-- Install alongside the nullable expansion so even an older application writer
-- records replacements correctly before the legacy backfill runs.
CREATE FUNCTION calendar.record_assignment_time() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  old_event uuid;
  new_event uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.assigned_at := clock_timestamp();
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    NEW.assigned_at := clock_timestamp();
  ELSIF NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
    SELECT event_id INTO old_event FROM calendar.junction_shifts WHERE id = OLD.shift_id;
    SELECT event_id INTO new_event FROM calendar.junction_shifts WHERE id = NEW.shift_id;
    IF new_event IS DISTINCT FROM old_event THEN
      NEW.assigned_at := clock_timestamp();
    ELSE
      NEW.assigned_at := OLD.assigned_at;
    END IF;
  ELSE
    NEW.assigned_at := OLD.assigned_at;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER record_assignment_time
BEFORE INSERT OR UPDATE OF user_id, shift_id ON calendar.junction_slots
FOR EACH ROW EXECUTE FUNCTION calendar.record_assignment_time();
