-- =============================================================================
-- AuraSkin AI — Payment System Tables
-- Run after: auth-profiles, public-panel, store-panel, dermatologist-panel
-- =============================================================================

-- -----------------------------------------------------------------------------
-- payments: user payments (orders or consultations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE SET NULL,
  payment_method text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_consultation_id ON payments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- -----------------------------------------------------------------------------
-- payouts: store or dermatologist payouts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('store', 'dermatologist')),
  amount numeric NOT NULL,
  payout_status text NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid', 'failed')),
  stripe_transfer_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_recipient_id ON payouts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient_type ON payouts(recipient_type);
CREATE INDEX IF NOT EXISTS idx_payouts_payout_status ON payouts(payout_status);

-- -----------------------------------------------------------------------------
-- refunds: refund requests and status
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  refund_amount numeric NOT NULL,
  reason text,
  refund_status text NOT NULL DEFAULT 'pending'
    CHECK (refund_status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);

-- -----------------------------------------------------------------------------
-- payment_audit_logs: audit trail for payment events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_event_type ON payment_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON payment_audit_logs(created_at);

-- -----------------------------------------------------------------------------
-- RLS: backend uses service role; policies for future client use
-- -----------------------------------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass is implicit when using service key; no INSERT policy for anon
-- so only backend (service role) can insert/update payments
