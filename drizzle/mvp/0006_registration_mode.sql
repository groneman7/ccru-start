CREATE TABLE "authz"."organization_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"registration_mode" text DEFAULT 'invitation-only' NOT NULL,
	CONSTRAINT "organization_settings_singleton" CHECK ("authz"."organization_settings"."id" = 1),
	CONSTRAINT "registration_mode_values" CHECK ("authz"."organization_settings"."registration_mode" IN ('invitation-only', 'open'))
);

--> statement-breakpoint
INSERT INTO authz.organization_settings (id, registration_mode) VALUES (1, 'invitation-only');
