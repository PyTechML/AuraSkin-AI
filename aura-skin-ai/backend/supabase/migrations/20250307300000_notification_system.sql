-- =============================================================================
-- AuraSkin AI — Notification & Event System
-- =============================================================================

-- -----------------------------------------------------------------------------
-- notifications: central in-app notifications per recipient
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_role text NOT NULL CHECK (recipient_role IN ('user', 'store', 'dermatologist', 'admin')),
  type text NOT NULL,
  title text,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id_is_read ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- -----------------------------------------------------------------------------
-- notification_events: event log for async processing
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_status ON notification_events(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at);

-- -----------------------------------------------------------------------------
-- notification_preferences: per-user delivery preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- -----------------------------------------------------------------------------
-- RLS: notifications
-- -----------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- INSERT only via service role (no policy for anon)

-- -----------------------------------------------------------------------------
-- RLS: notification_events (backend only; no client access)
-- -----------------------------------------------------------------------------
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE for anon; service role bypasses

-- -----------------------------------------------------------------------------
-- RLS: notification_preferences
-- -----------------------------------------------------------------------------
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
