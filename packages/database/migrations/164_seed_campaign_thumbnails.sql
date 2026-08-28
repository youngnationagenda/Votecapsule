-- ============================================================
-- VoteCapsule™ — Seed Campaign Material Thumbnail URLs
-- Migration: 164_seed_campaign_thumbnails.sql
-- Maps product images to categories and material types
-- Images stored in: s3://votecapsule-campaign-assets/catalogue/
-- ============================================================

-- ── Add thumbnail_url column to categories table ────────────
ALTER TABLE campaign_material_categories
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(1000);

-- Base URL for all catalogue images
-- Sonie: Upload images from /images/catalogue/ to this S3/CloudFront path
-- Update the domain below if the CloudFront distribution URL differs

-- ── Category Thumbnails ─────────────────────────────────────
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'PRINTED_MATERIALS';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_BRANDED_CLOTHING.jpg' WHERE code = 'BRANDED_CLOTHING';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_OUTDOOR_ADVERTISING.jpg' WHERE code = 'OUTDOOR_ADVERTISING';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_DIGITAL_MEDIA.png' WHERE code = 'DIGITAL_MEDIA';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_VEHICLE_BRANDING.jpg' WHERE code = 'VEHICLE_BRANDING';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_EVENT_SUPPLIES.jpg' WHERE code = 'EVENT_SUPPLIES';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PROMOTIONAL_ITEMS.jpg' WHERE code = 'PROMOTIONAL_ITEMS';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_STATIONERY.jpg' WHERE code = 'STATIONERY';
UPDATE campaign_material_categories SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_MEDIA_PRODUCTION.jpg' WHERE code = 'MEDIA_PRODUCTION';

-- ── Material Type Thumbnails (specific products) ────────────

-- Clothing
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/TSHIRT_POLO.png' WHERE code = 'TSHIRT_POLO';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/TSHIRT_POLO.png' WHERE code = 'TSHIRT_ROUND';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/TSHIRT_POLO.png' WHERE code = 'TSHIRT_V_NECK';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/TSHIRT_CORPORATE.jpg' WHERE code = 'JACKET_FLEECE';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/TSHIRT_CORPORATE.jpg' WHERE code = 'JACKET_WINDBREAKER';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/CAP_BASEBALL.jpg' WHERE code = 'CAP_BASEBALL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/CAP_BASEBALL.jpg' WHERE code = 'CAP_TRUCKER';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/CAP_BASEBALL.jpg' WHERE code = 'CAP_BUCKET';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/CAP_BASEBALL.jpg' WHERE code = 'BEANIE';

-- Banners
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg' WHERE code = 'BANNER_PULL_UP';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_X_STAND.jpg' WHERE code = 'BANNER_X_STAND';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg' WHERE code = 'BANNER_FABRIC';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg' WHERE code = 'BANNER_VINYL_SMALL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg' WHERE code = 'BANNER_VINYL_MEDIUM';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg' WHERE code = 'BANNER_VINYL_LARGE';

-- Printed Materials
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BUSINESS_CARD.jpg' WHERE code = 'BUSINESS_CARD';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/CALENDAR_WALL.jpg' WHERE code = 'CALENDAR_WALL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/CALENDAR_DESK.png' WHERE code = 'CALENDAR_DESK';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'BROCHURE_A4';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'LEAFLET_TRIFOLD';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'LEAFLET_BIFOLD';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'FLYER_A5';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'FLYER_DL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code = 'POSTCARD';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_STATIONERY.jpg' WHERE code = 'LETTERHEAD';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_STATIONERY.jpg' WHERE code = 'ENVELOPE_BRANDED';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_STATIONERY.jpg' WHERE code = 'NOTEPAD_A5';

-- Outdoor / Signage
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/LAMP_POST_BANNER.jpg' WHERE code = 'LAMP_POST_BANNER';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BILLBOARD_MEDIUM.jpg' WHERE code = 'BILLBOARD_MEGA';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BILLBOARD_MEDIUM.jpg' WHERE code = 'BILLBOARD_LARGE';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BILLBOARD_MEDIUM.jpg' WHERE code = 'BILLBOARD_MEDIUM';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BILLBOARD_MEDIUM.jpg' WHERE code = 'BILLBOARD_SMALL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/LAMP_POST_BANNER.jpg' WHERE code = 'BANNER_STREET';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/LAMP_POST_BANNER.jpg' WHERE code = 'BANNER_MUNICIPAL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/SIGNAGE_POST.jpg' WHERE code = 'SIGNAGE_POST';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/SIGNAGE_PYLON.jpg' WHERE code = 'SIGNAGE_ARROW';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_OUTDOOR_ADVERTISING.jpg' WHERE code = 'POSTER_OUTDOOR';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_OUTDOOR_ADVERTISING.jpg' WHERE code = 'YARD_SIGN';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_OUTDOOR_ADVERTISING.jpg' WHERE code = 'FENCE_BANNER';

-- Vehicle branding
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/VEHICLE_WRAP_FULL.jpg' WHERE code = 'VEHICLE_WRAP_FULL';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/VEHICLE_WRAP_FULL.jpg' WHERE code = 'VEHICLE_WRAP_HALF';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/VEHICLE_WRAP_FULL.jpg' WHERE code = 'VEHICLE_MAGNET';

-- Promotional items
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'MUG_BRANDED';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'WATER_BOTTLE';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'UMBRELLA_BRANDED';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'TOTE_BAG';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'PEN_BRANDED';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'NOTEBOOK_BRANDED';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'KEYRING_BRANDED';
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/PROMO_COLLECTION.png' WHERE code = 'BADGE_PIN';

-- Posters (use printed materials category image)
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code IN ('A4_POSTER','A3_POSTER','A2_POSTER','A1_POSTER','A0_POSTER');

-- Stickers
UPDATE campaign_material_types SET thumbnail_url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/cat_PRINTED_MATERIALS.png' WHERE code IN ('STICKER_A4','STICKER_ROUND','STICKER_OVAL','STICKER_BUMPER');

-- ── Fallback: set category image for any type still missing thumbnail ──
UPDATE campaign_material_types t
SET thumbnail_url = c.thumbnail_url
FROM campaign_material_categories c
WHERE t.category_id = c.id
  AND t.thumbnail_url IS NULL
  AND c.thumbnail_url IS NOT NULL;
