CREATE TABLE "authz"."comments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "authz"."notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	CONSTRAINT "notification_recipient_unique" UNIQUE("notification_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "authz"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"kind" text NOT NULL,
	"audience" text NOT NULL,
	"recipient_id" uuid,
	"user_certification_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "notification_audience" CHECK (("authz"."notifications"."kind"='certification-review' AND "authz"."notifications"."audience"='user-management' AND "authz"."notifications"."recipient_id" IS NULL) OR ("authz"."notifications"."kind"='certification-rejected' AND "authz"."notifications"."audience"='personal' AND "authz"."notifications"."recipient_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "authz"."user_certifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"certification_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"review_comment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_certification_status" CHECK ("authz"."user_certifications"."status" IN ('pending','verified','rejected')),
	CONSTRAINT "user_certification_version" CHECK ("authz"."user_certifications"."version">0)
);
--> statement-breakpoint
ALTER TABLE "authz"."comments" ADD CONSTRAINT "comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "better-auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "authz"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better-auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "better-auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."notifications" ADD CONSTRAINT "notifications_user_certification_id_user_certifications_id_fk" FOREIGN KEY ("user_certification_id") REFERENCES "authz"."user_certifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."user_certifications" ADD CONSTRAINT "user_certifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better-auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."user_certifications" ADD CONSTRAINT "user_certifications_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "authz"."certifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz"."user_certifications" ADD CONSTRAINT "user_certifications_review_comment_id_comments_id_fk" FOREIGN KEY ("review_comment_id") REFERENCES "authz"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_certification_review" ON "authz"."notifications" USING btree ("user_certification_id") WHERE "authz"."notifications"."kind"='certification-review' AND "authz"."notifications"."resolved_at" IS NULL AND "authz"."notifications"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_certification_live_unique" ON "authz"."user_certifications" USING btree ("user_id","certification_id") WHERE "authz"."user_certifications"."deleted_at" IS NULL;--> statement-breakpoint
CREATE FUNCTION authz.guard_user_certification_reference() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Certification changes require Read Committed isolation'; END IF;
  PERFORM pg_advisory_xact_lock(736192,10);
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'User certifications are retained; use soft deletion'; END IF;
  IF TG_OP='UPDATE' AND NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'Certification owner cannot change'; END IF;
  IF NEW.deleted_at IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM authz.certifications WHERE id=NEW.certification_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Certification is deleted or does not exist'; END IF;
    IF NOT EXISTS (SELECT 1 FROM "better-auth"."user" WHERE id=NEW.user_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Profile is deleted or does not exist'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER guard_user_certification_reference BEFORE INSERT OR UPDATE OR DELETE ON authz.user_certifications
FOR EACH ROW EXECUTE FUNCTION authz.guard_user_certification_reference();
--> statement-breakpoint
CREATE FUNCTION authz.write_user_certification(p_actor uuid,p_user uuid,p_id uuid,p_cert uuid,p_action text,p_version integer,p_comment text) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE item authz.user_certifications%ROWTYPE; previous_status text; owner_name text; certification_name text; comment_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(736192,10);
  IF p_action IN ('submit','create-verified') THEN
    INSERT INTO authz.user_certifications (user_id,certification_id,status)
      VALUES (p_user,p_cert,CASE WHEN p_action='submit' THEN 'pending' ELSE 'verified' END) RETURNING * INTO item;
  ELSE
    SELECT * INTO item FROM authz.user_certifications WHERE id=p_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'User certification not found'; END IF;
    IF item.version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Submission changed; refresh before trying again'; END IF;
    previous_status:=item.status;
    IF p_action='edit' THEN
      IF item.status NOT IN ('pending','rejected') THEN RAISE EXCEPTION 'Certification cannot be changed in its current state'; END IF;
      IF item.review_comment_id IS NOT NULL THEN UPDATE authz.comments SET deleted_at=now() WHERE id=item.review_comment_id; END IF;
      UPDATE authz.user_certifications SET certification_id=p_cert,status='pending',review_comment_id=NULL,version=version+1,updated_at=now() WHERE id=item.id RETURNING * INTO item;
    ELSIF p_action='withdraw' THEN
      UPDATE authz.user_certifications SET deleted_at=now(),version=version+1,updated_at=now() WHERE id=item.id RETURNING * INTO item;
    ELSIF p_action IN ('approve','reject') THEN
      IF item.status<>'pending' THEN RAISE EXCEPTION 'Certification cannot be changed in its current state'; END IF;
      IF p_action='reject' AND nullif(trim(p_comment),'') IS NOT NULL THEN
        INSERT INTO authz.comments (author_id,body) VALUES (p_actor,trim(p_comment)) RETURNING id INTO comment_id;
      END IF;
      UPDATE authz.user_certifications SET status=CASE WHEN p_action='approve' THEN 'verified' ELSE 'rejected' END,review_comment_id=comment_id,version=version+1,updated_at=now() WHERE id=item.id RETURNING * INTO item;
    ELSE RAISE EXCEPTION 'Unsupported certification action'; END IF;
  END IF;
  SELECT display INTO owner_name FROM "better-auth"."user" WHERE id=item.user_id;
  SELECT display INTO certification_name FROM authz.certifications WHERE id=item.certification_id;
  IF p_action='submit' OR (p_action='edit' AND previous_status='rejected') THEN
    INSERT INTO authz.notifications (kind,audience,user_certification_id,body)
      VALUES ('certification-review','user-management',item.id,format('%s submitted %s for review.',owner_name,certification_name));
  END IF;
  IF p_action IN ('approve','reject','withdraw') THEN
    UPDATE authz.notifications SET resolved_at=now() WHERE user_certification_id=item.id AND kind='certification-review' AND resolved_at IS NULL;
  END IF;
  IF p_action='reject' THEN
    INSERT INTO authz.notifications (kind,audience,recipient_id,user_certification_id,body)
      VALUES ('certification-rejected','personal',item.user_id,item.id,format('Your %s certification was rejected.%s',certification_name,CASE WHEN nullif(trim(p_comment),'') IS NULL THEN '' ELSE ' '||trim(p_comment) END));
  END IF;
  RETURN item.id;
END $$;

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
CREATE FUNCTION authz.retain_inbox_record() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Inbox and comment records are retained; use soft deletion or dismissal'; END IF;
  IF TG_TABLE_NAME='notifications' AND (NEW.body IS DISTINCT FROM OLD.body OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.audience IS DISTINCT FROM OLD.audience OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id OR NEW.user_certification_id IS DISTINCT FROM OLD.user_certification_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Delivered notification content is immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER retain_notifications BEFORE UPDATE OR DELETE ON authz.notifications FOR EACH ROW EXECUTE FUNCTION authz.retain_inbox_record();
--> statement-breakpoint
CREATE TRIGGER retain_comments BEFORE DELETE ON authz.comments FOR EACH ROW EXECUTE FUNCTION authz.retain_inbox_record();
--> statement-breakpoint
CREATE TRIGGER retain_notification_recipients BEFORE DELETE ON authz.notification_recipients FOR EACH ROW EXECUTE FUNCTION authz.retain_inbox_record();
