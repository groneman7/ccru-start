ALTER TABLE "better-auth"."user" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "authz"."user_types" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- Assignment and deletion serialize on the type row. An inactive profile is
-- still a live reference; only an explicit deletion marker excludes it.
CREATE FUNCTION authz.require_live_user_type() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.user_type_id IS NOT NULL THEN
    PERFORM 1 FROM authz.user_types WHERE id=NEW.user_type_id AND deleted_at IS NULL FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User type is deleted or does not exist' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER require_live_user_type BEFORE INSERT OR UPDATE OF user_type_id, deleted_at
ON "better-auth"."user" FOR EACH ROW EXECUTE FUNCTION authz.require_live_user_type();
--> statement-breakpoint
CREATE FUNCTION authz.retain_assigned_user_type() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM "better-auth"."user" WHERE user_type_id=OLD.id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User type is assigned to a non-deleted profile' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER retain_assigned_user_type BEFORE UPDATE OF deleted_at
ON authz.user_types FOR EACH ROW EXECUTE FUNCTION authz.retain_assigned_user_type();
