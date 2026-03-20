-- =============================================================================
-- AuraSkin AI — DB integrity and performance indexes
-- Idempotent migration (safe to run multiple times)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Integrity: ensure one report per assessment
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_assessment_id
ON reports (assessment_id);

-- -----------------------------------------------------------------------------
-- 2. Integrity: prevent duplicate routine logs
-- same user + plan + date + time slot (only if table exists)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'routine_logs'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_routine_logs_plan_slot
    ON routine_logs (user_id, routine_plan_id, date, time_of_day);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Performance indexes
-- -----------------------------------------------------------------------------

-- Assessments lookup by user
CREATE INDEX IF NOT EXISTS idx_assessments_user_id
ON assessments (user_id);

-- Reports lookup by assessment
CREATE INDEX IF NOT EXISTS idx_reports_assessment_id
ON reports (assessment_id);

-- Orders lookup by user
CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders (user_id);

-- Products lookup by store
CREATE INDEX IF NOT EXISTS idx_products_store_id
ON products (store_id);

-- Analytics time queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON analytics_events (created_at);

-- Analytics filtering by event type
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
ON analytics_events (event_type);
