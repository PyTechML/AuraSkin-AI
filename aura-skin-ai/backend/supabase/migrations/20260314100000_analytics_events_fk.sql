-- =============================================================================
-- AuraSkin AI — Add foreign keys to analytics_events for referential integrity
-- Safe when analytics_events is empty or user_id/store_id reference valid rows.
-- =============================================================================

-- Only add constraints if they do not already exist (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'analytics_events'
    AND constraint_name = 'fk_analytics_events_user_id'
  ) THEN
    ALTER TABLE analytics_events
    ADD CONSTRAINT fk_analytics_events_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'analytics_events'
    AND constraint_name = 'fk_analytics_events_store_id'
  ) THEN
    ALTER TABLE analytics_events
    ADD CONSTRAINT fk_analytics_events_store_id
    FOREIGN KEY (store_id) REFERENCES store_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
