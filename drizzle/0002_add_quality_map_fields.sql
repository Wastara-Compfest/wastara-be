ALTER TABLE "defect_events" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "defect_events" ADD COLUMN "meter" double precision;--> statement-breakpoint
ALTER TABLE "defect_events" ADD COLUMN "position" double precision;--> statement-breakpoint
ALTER TABLE "defect_events" ADD CONSTRAINT "defect_events_session_id_production_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."production_sessions"("id") ON DELETE no action ON UPDATE no action;