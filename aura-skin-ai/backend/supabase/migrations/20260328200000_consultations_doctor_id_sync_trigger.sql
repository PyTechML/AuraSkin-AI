-- =============================================================================
-- Consultations: doctor_id sync with dermatologist_id (non-destructive)
-- - No DROP, DELETE, or TRUNCATE. Adds column if missing; backfills NULLs only.
-- - Trigger is created once if absent; function is always replaced safely.
-- =============================================================================

-- 1) Add column only if it does not exist (no data removal)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES dermatologist_profiles(id) ON DELETE CASCADE;

-- 2) Backfill: set doctor_id where it was never set (does not delete rows)
UPDATE public.consultations
SET doctor_id = dermatologist_id
WHERE doctor_id IS NULL AND dermatologist_id IS NOT NULL;

-- 3) Function: keep in sync on insert/update (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION public.consultations_sync_doctor_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.doctor_id IS NULL AND NEW.dermatologist_id IS NOT NULL THEN
    NEW.doctor_id := NEW.dermatologist_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Register trigger only if missing (avoids DROP TRIGGER, which tools flag as destructive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_consultations_sync_doctor_id'
      AND n.nspname = 'public'
      AND c.relname = 'consultations'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER trg_consultations_sync_doctor_id
      BEFORE INSERT OR UPDATE OF dermatologist_id, doctor_id ON public.consultations
      FOR EACH ROW
      EXECUTE PROCEDURE public.consultations_sync_doctor_id();
  END IF;
END $$;
