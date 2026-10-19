ALTER TABLE "better-auth"."user" ALTER COLUMN "role" SET DEFAULT 'User';--> statement-breakpoint
ALTER TABLE "better-auth"."user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD COLUMN "can_manage_scheduling" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD COLUMN "can_manage_users" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD CONSTRAINT "user_single_role" CHECK ("better-auth"."user"."role" IN ('User', 'Officer', 'Administrator', 'Developer'));--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD CONSTRAINT "officer_capabilities_only" CHECK ("better-auth"."user"."role" = 'Officer' OR (NOT "better-auth"."user"."can_manage_scheduling" AND NOT "better-auth"."user"."can_manage_users"));