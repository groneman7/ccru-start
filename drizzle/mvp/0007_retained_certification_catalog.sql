ALTER TABLE "authz"."certifications" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- Reject pre-existing cycles without repairing or discarding retained records.
DO $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE walk(origin,id,parent) AS (
      SELECT id,id,parent FROM authz.certifications
      UNION
      SELECT w.origin,c.id,c.parent FROM walk w JOIN authz.certifications c ON c.id=w.parent
    ) SELECT 1 FROM walk WHERE parent=origin
  ) THEN RAISE EXCEPTION 'Existing certification hierarchy contains a cycle; reconcile it explicitly'; END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION authz.guard_certification_catalog() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  -- A shared mutation lock serializes graph edits, including edits to disjoint
  -- rows. Subsequent queries need fresh Read Committed snapshots after waiting.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Catalog changes require Read Committed isolation' USING ERRCODE='25000';
  END IF;
  PERFORM pg_advisory_xact_lock(736192,10);
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Certification definitions are retained; use soft deletion' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM authz.certifications WHERE parent=OLD.id AND deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'Certification has non-deleted children' USING ERRCODE='23514'; END IF;
  IF NEW.parent IS NOT NULL THEN
    IF NEW.parent=NEW.id OR EXISTS (
      WITH RECURSIVE ancestors(id,parent) AS (
        SELECT id,parent FROM authz.certifications WHERE id=NEW.parent
        UNION
        SELECT c.id,c.parent FROM authz.certifications c JOIN ancestors a ON c.id=a.parent
      ) SELECT 1 FROM ancestors WHERE id=NEW.id
    ) THEN RAISE EXCEPTION 'Certification hierarchy cannot contain a cycle' USING ERRCODE='23514'; END IF;
    IF NEW.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM authz.certifications WHERE id=NEW.parent AND deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Parent certification is deleted or does not exist' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER guard_certification_catalog BEFORE INSERT OR UPDATE OR DELETE
ON authz.certifications FOR EACH ROW EXECUTE FUNCTION authz.guard_certification_catalog();
