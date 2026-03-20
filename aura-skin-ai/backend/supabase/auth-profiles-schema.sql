-- =============================================================================
-- AuraSkin AI — Profiles table & trigger for auth role storage
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================================

-- Profiles: one row per auth.users, stores role and profile fields
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'store', 'dermatologist', 'admin')),
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Trigger function: create profile on signup (role=user; full_name from user_metadata)
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: after insert on auth.users (create only if not exists; no destructive operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.create_profile_for_user()';
  END IF;
END
$$;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow profile insert so the trigger on auth.users can create a row (no DROP; create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow profile insert for new user') THEN
    CREATE POLICY "Allow profile insert for new user" ON profiles FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Backend uses service role and bypasses RLS.
-- Optional: allow authenticated users to read/update own profile (for future use)
-- CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
