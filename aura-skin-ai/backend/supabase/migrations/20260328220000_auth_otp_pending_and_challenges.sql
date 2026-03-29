-- =============================================================================
-- AuraSkin AI — Pending email+password signups and login/OAuth OTP challenges
-- Backend-only (service role). RLS enabled with no policies = deny via PostgREST.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_ciphertext text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  resend_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_otp_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_signups_email ON pending_signups (email);
CREATE INDEX IF NOT EXISTS idx_pending_signups_expires_at ON pending_signups (expires_at);

CREATE TABLE IF NOT EXISTS auth_login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('password', 'oauth')),
  email text NOT NULL,
  user_id uuid,
  tokens_ciphertext text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  resend_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_otp_sent_at timestamptz,
  requested_role text,
  oauth_next text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_login_challenges_expires_at ON auth_login_challenges (expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_login_challenges_email ON auth_login_challenges (email);

ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_login_challenges ENABLE ROW LEVEL SECURITY;
