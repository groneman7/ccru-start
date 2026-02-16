CREATE SCHEMA "authz";
--> statement-breakpoint
CREATE SCHEMA "better-auth";
--> statement-breakpoint
CREATE SCHEMA "calendar";
--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'invited');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('active', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."single_multiple" AS ENUM('single', 'multiple');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('active', 'deleted');--> statement-breakpoint
CREATE TABLE "better-auth"."account" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authz"."certifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"display" text NOT NULL,
	CONSTRAINT "certifications_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "calendar"."events" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" text,
	"time_begin" timestamp with time zone,
	"time_end" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "calendar"."junction_shifts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"event_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "shift_status" DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "calendar"."junction_slots" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"shift_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "slot_status" DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "calendar"."junction_template_positions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"template_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar"."positions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"display" text NOT NULL,
	"description" text,
	CONSTRAINT "positions_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "better-auth"."session" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "authz"."system_roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"display" text NOT NULL,
	CONSTRAINT "system_roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "calendar"."templates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"display" text NOT NULL,
	"description" text,
	"time_begin" time NOT NULL,
	"time_end" time,
	"location" text,
	CONSTRAINT "templates_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "better-auth"."user" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"name_first" text,
	"name_middle" text,
	"name_last" text,
	"phone_number" text,
	"phone_number_verified" boolean,
	"post_nominals" text,
	"status" "account_status",
	"timestamp_created_at" timestamp DEFAULT now() NOT NULL,
	"timestamp_first_login" timestamp,
	"timestamp_onboarding_completed" timestamp,
	"timestamp_updated_at" timestamp DEFAULT now() NOT NULL,
	"system_role_id" uuid,
	"user_type_id" uuid,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "authz"."user_types" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"display" text NOT NULL,
	CONSTRAINT "user_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "better-auth"."verification" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar"."events" ADD CONSTRAINT "created_by" FOREIGN KEY ("created_by") REFERENCES "better-auth"."user"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar"."junction_shifts" ADD CONSTRAINT "event_id" FOREIGN KEY ("event_id") REFERENCES "calendar"."events"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar"."junction_shifts" ADD CONSTRAINT "position_id" FOREIGN KEY ("position_id") REFERENCES "calendar"."positions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar"."junction_slots" ADD CONSTRAINT "shift_id" FOREIGN KEY ("shift_id") REFERENCES "calendar"."junction_shifts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar"."junction_slots" ADD CONSTRAINT "user_id" FOREIGN KEY ("user_id") REFERENCES "better-auth"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "calendar"."junction_template_positions" ADD CONSTRAINT "template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "calendar"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."junction_template_positions" ADD CONSTRAINT "position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "calendar"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better-auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better-auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD CONSTRAINT "system_role_fkey" FOREIGN KEY ("system_role_id") REFERENCES "authz"."system_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better-auth"."user" ADD CONSTRAINT "user_type_fkey" FOREIGN KEY ("user_type_id") REFERENCES "authz"."user_types"("id") ON DELETE restrict ON UPDATE no action;