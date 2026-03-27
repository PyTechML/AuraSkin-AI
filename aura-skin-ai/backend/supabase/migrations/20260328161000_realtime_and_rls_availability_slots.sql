-- Realtime for live slot updates on public booking UIs; minimal SELECT RLS for anon clients.
-- Ensures availability_slots exists when this file is run before 20260326120000 (e.g. SQL Editor only).

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

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'availability_slots'
      AND policyname = 'availability_slots_public_read_available'
  ) THEN
    CREATE POLICY "availability_slots_public_read_available"
      ON availability_slots
      FOR SELECT
      USING (status = 'available');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'availability_slots'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;
    END IF;
  END IF;
END $$;
