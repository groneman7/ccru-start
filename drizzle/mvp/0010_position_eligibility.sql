ALTER TABLE "calendar"."positions" ADD COLUMN "eligibility_expression" jsonb;--> statement-breakpoint
ALTER TABLE "calendar"."positions" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE FUNCTION calendar.validate_requirement(node jsonb) RETURNS uuid[]
IMMUTABLE STRICT LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE child jsonb; refs uuid[]:='{}'; kind text:=node->>'type'; keys integer;
BEGIN
  IF jsonb_typeof(node) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid eligibility requirement'; END IF;
  SELECT count(*) INTO keys FROM jsonb_object_keys(node);
  IF kind IN ('and','or') THEN
    IF keys<>2 OR jsonb_typeof(node->'children') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid eligibility group'; END IF;
    IF jsonb_array_length(node->'children')=0 THEN RAISE EXCEPTION 'Eligibility groups require a child'; END IF;
    FOR child IN SELECT value FROM jsonb_array_elements(node->'children') LOOP refs:=refs||calendar.validate_requirement(child); END LOOP;
  ELSIF kind='certification' THEN
    IF keys<>3 OR node->>'match' IS NULL OR node->>'match' NOT IN ('exact','descendants') OR jsonb_typeof(node->'certificationId') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid certification requirement'; END IF;
    refs:=ARRAY[(node->>'certificationId')::uuid];
  ELSIF kind='minimum-role' THEN
    IF keys<>2 OR node->>'role' IS NULL OR node->>'role' NOT IN ('User','Officer','Administrator','Developer') THEN RAISE EXCEPTION 'Invalid minimum role'; END IF;
  ELSE RAISE EXCEPTION 'Unsupported eligibility requirement'; END IF;
  RETURN refs;
END $$;
--> statement-breakpoint
CREATE FUNCTION calendar.guard_position_requirements() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE refs uuid[]; keys integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Positions are retained; use soft deletion'; END IF;
  IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Position changes require Read Committed isolation'; END IF;
  PERFORM pg_advisory_xact_lock(736192,10);
  IF NEW.eligibility_expression IS NOT NULL THEN
    IF jsonb_typeof(NEW.eligibility_expression) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid eligibility expression'; END IF;
    SELECT count(*) INTO keys FROM jsonb_object_keys(NEW.eligibility_expression);
    IF keys<>2 OR NEW.eligibility_expression->'version' IS DISTINCT FROM '1'::jsonb OR NOT NEW.eligibility_expression ? 'root' THEN RAISE EXCEPTION 'Invalid eligibility expression version'; END IF;
    refs:=calendar.validate_requirement(NEW.eligibility_expression->'root');
    IF NEW.deleted_at IS NULL AND EXISTS (SELECT 1 FROM unnest(refs) ref WHERE NOT EXISTS (SELECT 1 FROM authz.certifications c WHERE c.id=ref AND c.deleted_at IS NULL)) THEN RAISE EXCEPTION 'Requirement certification is deleted or does not exist'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER guard_position_requirements BEFORE INSERT OR UPDATE OR DELETE ON calendar.positions FOR EACH ROW EXECUTE FUNCTION calendar.guard_position_requirements();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION authz.guard_certification_catalog() RETURNS trigger
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
  IF TG_OP='UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM authz.user_certifications WHERE certification_id=OLD.id AND deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'Certification has non-deleted user records' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM calendar.positions p WHERE p.deleted_at IS NULL AND p.eligibility_expression IS NOT NULL AND OLD.id=ANY(calendar.validate_requirement(p.eligibility_expression->'root'))
  ) THEN RAISE EXCEPTION 'Certification has non-deleted position requirements' USING ERRCODE='23514'; END IF;
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

