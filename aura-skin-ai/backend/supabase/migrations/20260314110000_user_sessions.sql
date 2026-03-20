-- =============================================================================
-- AuraSkin AI — User sessions table for session tracking and activity monitoring
-- Idempotent: safe to run multiple times.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_token text NOT NULL,
  ip_address text,
  device_info text,
  login_time timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPICIOUS')),
  logout_time timestamptz
);

-- Unique index for heartbeat lookups by session_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_session_token
  ON user_sessions (session_token);

-- Indexes for admin queries and expiration job
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_status
  ON user_sessions (status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity
  ON user_sessions (last_activity);
