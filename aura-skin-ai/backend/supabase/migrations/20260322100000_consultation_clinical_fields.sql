-- UP9: Clinical fields on consultations (single row per booking; no separate notes table)

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS diagnosis text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS treatment_plan text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS follow_up_required boolean DEFAULT false;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE consultations
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;
