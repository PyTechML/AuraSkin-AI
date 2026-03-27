-- =============================================================================
-- AuraSkin AI — Clinical hybrid schema + order/report integrity
-- Forward-only, idempotent migration for production stabilization
-- =============================================================================

-- 1) Add missing order columns used by backend/frontend flows
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_estimate timestamptz;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS activity_log jsonb DEFAULT '[]'::jsonb;

-- 2) Physical patients table (hybrid model)
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  age integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- 3) Physical availability_slots table (hybrid model)
CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'booked', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_doctor_date
  ON availability_slots(doctor_id, date);

-- 4) Backfill availability_slots from existing consultation_slots
INSERT INTO availability_slots (id, doctor_id, date, start_time, end_time, status, created_at, updated_at)
SELECT cs.id, cs.dermatologist_id, cs.slot_date, cs.start_time, cs.end_time, cs.status, cs.created_at, now()
FROM consultation_slots cs
ON CONFLICT (id) DO UPDATE
SET
  doctor_id = EXCLUDED.doctor_id,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  status = EXCLUDED.status,
  updated_at = now();

-- 5) Ensure consultations can reference patient and hybrid availability table
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES dermatologist_profiles(id) ON DELETE CASCADE;

UPDATE consultations
SET doctor_id = dermatologist_id
WHERE doctor_id IS NULL AND dermatologist_id IS NOT NULL;

-- Keep doctor_id present for new writes
ALTER TABLE consultations
  ALTER COLUMN doctor_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consultations_slot_id_availability_slots_fkey'
  ) THEN
    ALTER TABLE consultations
      ADD CONSTRAINT consultations_slot_id_availability_slots_fkey
      FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6) Reports <-> consultations integrity + orphan cleanup
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS consultation_id uuid;

DELETE FROM reports r
WHERE r.consultation_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM consultations c WHERE c.id = r.consultation_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_consultation_id_fkey'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_consultation_id_fkey
      FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7) Compatibility bridge for legacy slot readers
CREATE OR REPLACE VIEW consultation_slots_view AS
SELECT
  id,
  doctor_id AS dermatologist_id,
  date AS slot_date,
  start_time,
  end_time,
  status,
  created_at
FROM availability_slots;

-- 8) Role mapping sanity check
DO $$
DECLARE
  has_invalid_role boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE role IS NOT NULL
      AND role NOT IN ('user', 'store', 'dermatologist', 'admin')
  ) INTO has_invalid_role;

  IF has_invalid_role THEN
    RAISE EXCEPTION 'profiles.role contains values outside allowed set';
  END IF;
END $$;
