-- =============================================================================
-- AuraSkin AI — Dermatologist Partner Panel Tables
-- Run this in Supabase Dashboard → SQL Editor (after auth-profiles-schema)
-- =============================================================================

-- Dermatologist profiles: one row per dermatologist partner (id = profiles.id)
CREATE TABLE IF NOT EXISTS dermatologist_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_name text,
  specialization text,
  years_experience integer,
  consultation_fee numeric,
  bio text,
  clinic_address text,
  city text,
  latitude numeric,
  longitude numeric,
  profile_image text,
  license_number text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Consultation slots: availability windows per dermatologist
CREATE TABLE IF NOT EXISTS consultation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  created_at timestamptz DEFAULT now()
);

-- Consultations: booking requests linking user, dermatologist, slot
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dermatologist_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES consultation_slots(id) ON DELETE CASCADE,
  consultation_status text NOT NULL DEFAULT 'pending' CHECK (consultation_status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  consultation_notes text,
  diagnosis text,
  treatment_plan text,
  follow_up_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prescriptions: issued after consultation
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dermatologist_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  prescription_text text,
  recommended_products uuid[],
  follow_up_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Dermatologist notifications (in-app alerts)
CREATE TABLE IF NOT EXISTS dermatologist_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  type text,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Earnings: payout tracking per consultation
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id uuid NOT NULL REFERENCES dermatologist_profiles(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_consultation_slots_dermatologist_date
  ON consultation_slots(dermatologist_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_consultations_dermatologist_id
  ON consultations(dermatologist_id);

CREATE INDEX IF NOT EXISTS idx_consultations_user_id
  ON consultations(user_id);

CREATE INDEX IF NOT EXISTS idx_consultations_slot_id
  ON consultations(slot_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id
  ON prescriptions(consultation_id);

CREATE INDEX IF NOT EXISTS idx_dermatologist_notifications_dermatologist_id
  ON dermatologist_notifications(dermatologist_id);

CREATE INDEX IF NOT EXISTS idx_earnings_dermatologist_id
  ON earnings(dermatologist_id);

-- =============================================================================
-- Row Level Security (optional; backend uses service role)
-- =============================================================================

ALTER TABLE dermatologist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dermatologist_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
