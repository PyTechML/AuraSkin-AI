-- =============================================================================
-- AuraSkin AI — User Panel Tables (Assessments, Reports, Recommendations)
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================================
-- If a "reports" table already exists with a different shape (e.g. title, date, summary),
-- drop or rename it first, or add a migration to alter columns.
-- =============================================================================

-- Assessments: questionnaire responses
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skin_type text,
  primary_concern text,
  secondary_concern text,
  sensitivity_level text,
  current_products text,
  lifestyle_factors text,
  created_at timestamptz DEFAULT now()
);

-- Assessment images: uploaded face photos (front, left, right)
CREATE TABLE IF NOT EXISTS assessment_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  image_type text NOT NULL CHECK (image_type IN ('front', 'left', 'right')),
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reports: skin analysis results (from AI pipeline)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  skin_condition text,
  acne_score numeric,
  pigmentation_score numeric,
  hydration_score numeric,
  recommended_routine text,
  created_at timestamptz DEFAULT now()
);

-- Recommended products per report (AI product recommendation)
CREATE TABLE IF NOT EXISTS recommended_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  confidence_score numeric
);

-- Recommended dermatologists per report (by city/distance/rating)
CREATE TABLE IF NOT EXISTS recommended_dermatologists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  dermatologist_id uuid NOT NULL REFERENCES dermatologists(id) ON DELETE CASCADE,
  distance_km numeric
);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_dermatologists ENABLE ROW LEVEL SECURITY;

-- Backend uses service role and bypasses RLS. Policies below allow future
-- direct client access restricted by user_id if needed.

CREATE POLICY "Users can read own assessments" ON assessments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own assessment images" ON assessment_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own assessment images" ON assessment_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Users can read own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read recommended_products for own reports" ON recommended_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports r WHERE r.id = report_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Service can insert recommended_products" ON recommended_products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read recommended_dermatologists for own reports" ON recommended_dermatologists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports r WHERE r.id = report_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Service can insert recommended_dermatologists" ON recommended_dermatologists
  FOR INSERT WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_images_assessment_id ON assessment_images(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_assessment_id ON reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_recommended_products_report_id ON recommended_products(report_id);
CREATE INDEX IF NOT EXISTS idx_recommended_dermatologists_report_id ON recommended_dermatologists(report_id);
