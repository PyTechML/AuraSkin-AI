-- =============================================================================
-- AuraSkin AI — Add reports.skin_score + routine tables
-- Idempotent migration (safe to run multiple times)
-- =============================================================================
-- Fixes production blockers:
-- - reports.skin_score column referenced by backend metrics + AI worker insert
-- - routine_plans / routine_logs tables referenced by API + metrics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Reports: add skin_score (0-100)
-- -----------------------------------------------------------------------------
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS skin_score numeric;

-- Optional integrity: keep skin_score within 0..100 when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_skin_score_range_check'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_skin_score_range_check
      CHECK (skin_score IS NULL OR (skin_score >= 0 AND skin_score <= 100));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Routine plans: generated from report (latest shown on Tracking page)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routine_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  morning_routine text[],
  night_routine text[],
  lifestyle_food_advice text[],
  lifestyle_hydration text[],
  lifestyle_sleep text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_plans_user_created_at
ON routine_plans (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_routine_plans_report_id
ON routine_plans (report_id);

-- -----------------------------------------------------------------------------
-- 3) Routine logs: adherence tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_plan_id uuid NOT NULL REFERENCES routine_plans(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_of_day text NOT NULL CHECK (time_of_day IN ('morning', 'night')),
  status text NOT NULL CHECK (status IN ('completed', 'skipped')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_logs_user_id
ON routine_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date
ON routine_logs (user_id, date DESC);

-- -----------------------------------------------------------------------------
-- 4) RLS (optional): keep consistent with other user-panel tables
-- Backend uses service role and bypasses RLS; these policies allow future direct
-- client reads restricted by auth.uid().
-- -----------------------------------------------------------------------------
ALTER TABLE routine_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_plans' AND policyname = 'Users can read own routine_plans'
  ) THEN
    CREATE POLICY "Users can read own routine_plans" ON routine_plans
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_plans' AND policyname = 'Service can insert routine_plans'
  ) THEN
    CREATE POLICY "Service can insert routine_plans" ON routine_plans
      FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_logs' AND policyname = 'Users can read own routine_logs'
  ) THEN
    CREATE POLICY "Users can read own routine_logs" ON routine_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_logs' AND policyname = 'Users can insert own routine_logs'
  ) THEN
    CREATE POLICY "Users can insert own routine_logs" ON routine_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

