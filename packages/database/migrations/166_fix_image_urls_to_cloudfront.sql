-- ============================================================
-- VoteCapsule™ — Migration 166: Fix Image URLs to CloudFront CDN
-- 
-- Problem: image_url in campaign_supplier_products and thumbnail_url
-- in campaign_material_types point to the old S3 path-style URL:
--   https://s3.amazonaws.com/votecapsule-campaign-assets/...
-- 
-- Fix: Replace with CloudFront CDN URL:
--   https://d1campaign.votecapsule.yna.co.ke/...
-- 
-- This fixes browser CORS blocking since the CloudFront distribution
-- has Managed-CORS-With-Preflight attached.
-- ============================================================

BEGIN;

-- ── 1. Fix campaign_supplier_products.image_url ──────────────
-- Replaces old S3 path-style URL with CloudFront CDN URL
UPDATE campaign_supplier_products
SET image_url = REPLACE(
  image_url,
  'https://s3.amazonaws.com/votecapsule-campaign-assets/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE image_url LIKE 'https://s3.amazonaws.com/votecapsule-campaign-assets/%';

-- Also fix regional S3 URL format if any
UPDATE campaign_supplier_products
SET image_url = REPLACE(
  image_url,
  'https://votecapsule-campaign-assets.s3.amazonaws.com/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE image_url LIKE 'https://votecapsule-campaign-assets.s3.amazonaws.com/%';

UPDATE campaign_supplier_products
SET image_url = REPLACE(
  image_url,
  'https://votecapsule-campaign-assets.s3.us-east-1.amazonaws.com/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE image_url LIKE 'https://votecapsule-campaign-assets.s3.us-east-1.amazonaws.com/%';

-- ── 2. Fix campaign_material_types.thumbnail_url ─────────────
UPDATE campaign_material_types
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://s3.amazonaws.com/votecapsule-campaign-assets/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE thumbnail_url LIKE 'https://s3.amazonaws.com/votecapsule-campaign-assets/%';

UPDATE campaign_material_types
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://votecapsule-campaign-assets.s3.amazonaws.com/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE thumbnail_url LIKE 'https://votecapsule-campaign-assets.s3.amazonaws.com/%';

UPDATE campaign_material_types
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://votecapsule-campaign-assets.s3.us-east-1.amazonaws.com/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE thumbnail_url LIKE 'https://votecapsule-campaign-assets.s3.us-east-1.amazonaws.com/%';

-- ── 3. Fix campaign_material_categories.thumbnail_url ────────
UPDATE campaign_material_categories
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://s3.amazonaws.com/votecapsule-campaign-assets/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE thumbnail_url LIKE 'https://s3.amazonaws.com/votecapsule-campaign-assets/%';

UPDATE campaign_material_categories
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://votecapsule-campaign-assets.s3.amazonaws.com/',
  'https://d1campaign.votecapsule.yna.co.ke/'
)
WHERE thumbnail_url LIKE 'https://votecapsule-campaign-assets.s3.amazonaws.com/%';

-- ── 4. Verification counts ───────────────────────────────────
-- After migration these counts should be 0:
-- SELECT COUNT(*) FROM campaign_supplier_products WHERE image_url LIKE 'https://s3.amazonaws.com/%';
-- SELECT COUNT(*) FROM campaign_material_types WHERE thumbnail_url LIKE 'https://s3.amazonaws.com/%';

-- ── 5. Record migration ──────────────────────────────────────
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('166_fix_image_urls_to_cloudfront.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
