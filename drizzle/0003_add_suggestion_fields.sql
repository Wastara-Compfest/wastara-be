ALTER TABLE "defect_events"
  ADD COLUMN IF NOT EXISTS "suggested_defect_type" text,
  ADD COLUMN IF NOT EXISTS "suggestion_confidence" double precision,
  ADD COLUMN IF NOT EXISTS "suggestion_method" text;
