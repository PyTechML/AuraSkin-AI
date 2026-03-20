-- =============================================================================
-- AuraSkin AI — Public Panel Tables & RLS
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================================

-- Products (spec + frontend/AI fields)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  image_url text,
  price numeric,
  store_id uuid,
  brand text,
  rating numeric,
  skin_type text[],
  concern text[],
  full_description text,
  key_ingredients text[],
  usage text,
  safety_notes text,
  created_at timestamptz DEFAULT now()
);

-- Denormalized approval status for marketplace visibility
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'LIVE'
  CHECK (approval_status IN ('DRAFT', 'PENDING', 'LIVE', 'REJECTED'));

-- Stores (spec + optional frontend fields)
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  contact_number text,
  description text,
  opening_hours text,
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- Dermatologists (spec + optional frontend fields)
CREATE TABLE IF NOT EXISTS dermatologists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  clinic_name text,
  city text,
  specialization text,
  latitude numeric,
  longitude numeric,
  contact_number text,
  profile_image text,
  email text,
  years_experience integer,
  consultation_fee numeric,
  rating numeric,
  created_at timestamptz DEFAULT now()
);

-- Blogs
CREATE TABLE IF NOT EXISTS blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  cover_image text,
  summary text,
  category text,
  created_at timestamptz DEFAULT now()
);

-- FAQ
CREATE TABLE IF NOT EXISTS faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL
);

-- Contact messages (spec + subject for form)
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dermatologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read for products, stores, dermatologists, blogs, faq
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read dermatologists" ON dermatologists FOR SELECT USING (true);
CREATE POLICY "Public read blogs" ON blogs FOR SELECT USING (true);
CREATE POLICY "Public read faq" ON faq FOR SELECT USING (true);

-- Public insert only for contact_messages (no read for anonymous)
CREATE POLICY "Public insert contact_messages" ON contact_messages FOR INSERT WITH CHECK (true);

-- Service role bypasses RLS; backend uses service role for all operations.
-- No SELECT on contact_messages for anon — only backend (service role) can read.
