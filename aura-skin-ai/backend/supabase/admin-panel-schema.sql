-- =============================================================================
-- AuraSkin AI — Admin Panel Tables & Schema Extensions
-- Run after: auth-profiles-schema, public-panel-schema, store-panel-schema, dermatologist-panel-schema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend existing tables for admin governance
-- -----------------------------------------------------------------------------

-- Profiles: add blocked flag for user moderation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

-- Store profiles: add approval status for store onboarding
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- -----------------------------------------------------------------------------
-- Product approvals (audit trail; inventory.status is source of truth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  approval_status text NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_approvals_approval_status ON product_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_product_approvals_store_id ON product_approvals(store_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_product_id ON product_approvals(product_id);

-- -----------------------------------------------------------------------------
-- Dermatologist verification
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dermatologist_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  verification_status text NOT NULL CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  license_document text,
  review_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dermatologist_verification_status ON dermatologist_verification(verification_status);
CREATE INDEX IF NOT EXISTS idx_dermatologist_verification_dermatologist_id ON dermatologist_verification(dermatologist_id);

-- -----------------------------------------------------------------------------
-- Platform notifications (broadcast by role)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role text NOT NULL CHECK (target_role IN ('user', 'store', 'dermatologist', 'admin')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_notifications_target_role ON platform_notifications(target_role);

-- -----------------------------------------------------------------------------
-- AI chatbot rules (blocked_keywords, rate_limit, query_limit)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chatbot_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('blocked_keywords', 'rate_limit', 'query_limit')),
  rule_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chatbot_rules_rule_type ON ai_chatbot_rules(rule_type);

-- -----------------------------------------------------------------------------
-- AI usage logs (for monitoring and abuse review)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  query text,
  response_tokens integer,
  model_used text,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model_used ON ai_usage_logs(model_used);

-- -----------------------------------------------------------------------------
-- Admin audit logs (every admin action)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_entity text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_entity ON admin_audit_logs(target_entity);

-- =============================================================================
-- Row Level Security (backend uses service role; RLS for future client use)
-- =============================================================================

ALTER TABLE product_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dermatologist_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chatbot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- No permissive policies: only service role (backend) can access these tables.
-- Add policies later if admin UI needs to use anon/authenticated keys.
