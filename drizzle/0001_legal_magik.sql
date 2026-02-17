ALTER TABLE "better-auth"."user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD COLUMN "ban_expires" timestamp;