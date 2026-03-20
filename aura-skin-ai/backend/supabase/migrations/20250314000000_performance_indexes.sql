-- =============================================================================
-- AuraSkin AI — Performance indexes (Fix #5)
-- Indexes for reports, orders, routine_logs, recommended_products, analytics_events
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_id ON routine_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recommended_products_report_id ON recommended_products(report_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
