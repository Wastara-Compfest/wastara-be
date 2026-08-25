ALTER TABLE "defect_events"
  ADD COLUMN IF NOT EXISTS "source_event_key" text;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "defect_events_source_event_key_unique"
  ON "defect_events" ("source_event_key");
