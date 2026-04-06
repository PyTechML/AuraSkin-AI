-- =============================================================================
-- AuraSkin AI — Add Email OTP fields to profiles
-- Tracks verification status for new user accounts and legacy compatibility.
-- =============================================================================

-- 1. Add columns to public.profiles if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_verified_at timestamptz;

-- 2. Mark existing users as verified and OTP-skip (legacy compatibility)
-- Any user created before this migration is considered "legacy" and trusted.
UPDATE public.profiles
SET email_verified = true,
    otp_required = false
WHERE email_verified IS FALSE OR email_verified IS NULL;

-- 3. Ensure role_requests also references modern profile state if needed (optional)
-- (No changes needed for role_requests here)

-- 4. Audit Index
CREATE INDEX IF NOT EXISTS idx_profiles_otp_required ON public.profiles (otp_required);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles (email_verified);
