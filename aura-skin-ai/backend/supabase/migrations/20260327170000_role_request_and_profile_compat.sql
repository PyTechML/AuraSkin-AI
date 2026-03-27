-- Compatibility migration for role-request moderation and public profile filters.

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END
$$;

ALTER TABLE IF EXISTS role_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE IF EXISTS role_requests
  ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;
