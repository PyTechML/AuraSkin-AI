-- Normalize legacy/lowercase/alias approval_status values and enforce canonical CHECK.
-- IMPORTANT: Drop the old CHECK first. If the live DB only allowed lowercase
-- ('draft','pending',...) any UPDATE to uppercase would fail with 23514 until the
-- constraint is removed.
--
-- Verification (run anytime):
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.products'::regclass AND contype = 'c';
--   SELECT DISTINCT approval_status FROM public.products;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_approval_status_check;

UPDATE public.products
SET approval_status = CASE
  WHEN approval_status IS NULL THEN 'LIVE'
  WHEN trim(approval_status) = '' THEN 'LIVE'
  WHEN lower(trim(approval_status)) IN ('draft') THEN 'DRAFT'
  WHEN lower(trim(approval_status)) IN ('pending', 'submitted', 'submitted_for_review') THEN 'PENDING'
  WHEN lower(trim(approval_status)) IN ('live', 'approved', 'approve') THEN 'LIVE'
  WHEN lower(trim(approval_status)) IN ('rejected', 'reject') THEN 'REJECTED'
  ELSE upper(trim(approval_status))
END
WHERE approval_status IS NOT NULL;

UPDATE public.products
SET approval_status = 'PENDING'
WHERE approval_status IS NOT NULL
  AND upper(trim(approval_status)) NOT IN ('DRAFT', 'PENDING', 'LIVE', 'REJECTED');

ALTER TABLE public.products
  ADD CONSTRAINT products_approval_status_check
  CHECK (approval_status IN ('DRAFT', 'PENDING', 'LIVE', 'REJECTED'));
