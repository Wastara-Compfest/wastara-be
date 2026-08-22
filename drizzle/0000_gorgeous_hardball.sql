CREATE TYPE "public"."defect_mode" AS ENUM('penenunan', 'penjahitan');--> statement-breakpoint
CREATE TYPE "public"."defect_status" AS ENUM('PENDING_REVIEW', 'CONFIRMED', 'FALSE_POSITIVE');--> statement-breakpoint
CREATE TYPE "public"."label_type" AS ENUM('confirmed', 'false_positive');--> statement-breakpoint
CREATE TABLE "defect_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"machine_id" text NOT NULL,
	"mode" "defect_mode" NOT NULL,
	"anomaly_score" double precision NOT NULL,
	"bbox_x" integer NOT NULL,
	"bbox_y" integer NOT NULL,
	"bbox_w" integer NOT NULL,
	"bbox_h" integer NOT NULL,
	"frame_start" integer NOT NULL,
	"frame_end" integer NOT NULL,
	"evidence_path" text,
	"status" "defect_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"defect_type" text,
	"reject_reason" text,
	"verified_at" timestamp with time zone,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "labeled_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"defect_event_id" text NOT NULL,
	"label" "label_type" NOT NULL,
	"defect_type" text,
	"exported_to_training" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meters_produced" double precision,
	"defect_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labeled_samples" ADD CONSTRAINT "labeled_samples_defect_event_id_defect_events_id_fk" FOREIGN KEY ("defect_event_id") REFERENCES "public"."defect_events"("id") ON DELETE no action ON UPDATE no action;