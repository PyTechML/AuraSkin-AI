-- =============================================================================
-- AuraSkin AI — Real-Time Consultation: Sessions, Messages, Recordings
-- Run after: auth-profiles, dermatologist-panel, payment_tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- consultation_sessions: video room and token per consultation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  room_id text NOT NULL UNIQUE,
  session_token text NOT NULL,
  session_status text NOT NULL DEFAULT 'scheduled'
    CHECK (session_status IN ('scheduled', 'active', 'completed', 'cancelled')),
  session_token_expires_at timestamptz NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  user_left_at timestamptz,
  dermatologist_left_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_consultation_id ON consultation_sessions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_room_id ON consultation_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_session_status ON consultation_sessions(session_status);

-- -----------------------------------------------------------------------------
-- consultation_messages: chat during consultation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_consultation_id ON consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_sender_id ON consultation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_created_at ON consultation_messages(created_at);

-- -----------------------------------------------------------------------------
-- consultation_recordings: recording metadata and URL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  recording_url text NOT NULL,
  duration integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_recordings_consultation_id ON consultation_recordings(consultation_id);

-- -----------------------------------------------------------------------------
-- RLS (backend uses service role)
-- -----------------------------------------------------------------------------
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_recordings ENABLE ROW LEVEL SECURITY;
