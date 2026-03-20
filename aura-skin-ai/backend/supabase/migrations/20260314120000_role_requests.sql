-- =============================================================================
-- AuraSkin AI — Role requests table (user requests for STORE/DERMATOLOGIST/ADMIN)
-- Run after: auth-profiles-schema, admin-panel-schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('store', 'dermatologist', 'admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_created_at ON role_requests(created_at);

ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;
