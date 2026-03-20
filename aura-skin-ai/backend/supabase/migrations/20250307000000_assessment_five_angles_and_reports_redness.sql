-- =============================================================================
-- AuraSkin AI — Assessment five angles + reports redness/severity
-- Run after user-panel-schema.sql
-- =============================================================================

-- 1. Assessment images: allow 5 required angles (keep legacy front/left/right for compatibility)
ALTER TABLE assessment_images DROP CONSTRAINT IF EXISTS assessment_images_image_type_check;
ALTER TABLE assessment_images ADD CONSTRAINT assessment_images_image_type_check CHECK (
  image_type IN (
    'front', 'left', 'right',
    'front_face', 'left_profile', 'right_profile', 'upward_angle', 'downward_angle'
  )
);

-- 2. Reports: add redness and inflammation for AI pipeline output
ALTER TABLE reports ADD COLUMN IF NOT EXISTS redness_score numeric;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS inflammation_level text;
