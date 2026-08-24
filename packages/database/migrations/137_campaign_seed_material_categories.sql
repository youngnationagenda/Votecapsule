-- ============================================================
-- VoteCapsule™ — Campaign Material Categories Seed
-- Migration: 137_campaign_seed_material_categories.sql
-- 17 categories with codes, names, icons
-- ============================================================

INSERT INTO campaign_material_categories (code, name, icon, sort_order) VALUES
  ('PRINTED_MATERIALS',   'Printed Materials',        'printer',      1),
  ('BRANDED_CLOTHING',    'Branded Clothing',          'shirt',        2),
  ('OUTDOOR_ADVERTISING', 'Outdoor Advertising',       'billboard',    3),
  ('DIGITAL_MEDIA',       'Digital Media',             'monitor',      4),
  ('VEHICLE_BRANDING',    'Vehicle Branding',          'truck',        5),
  ('EVENT_SUPPLIES',      'Event Supplies',            'tent',         6),
  ('PROMOTIONAL_ITEMS',   'Promotional Items',         'gift',         7),
  ('AUDIO_EQUIPMENT',     'Audio Equipment',           'volume-2',     8),
  ('STAGE_EQUIPMENT',     'Stage & Lighting',          'zap',          9),
  ('FOOD_BEVERAGES',      'Food & Beverages',          'coffee',      10),
  ('SECURITY_ITEMS',      'Security & Safety',         'shield',      11),
  ('STATIONERY',          'Stationery & Office',       'file-text',   12),
  ('SOCIAL_MEDIA',        'Social Media Assets',       'share-2',     13),
  ('COMMUNICATION_TOOLS', 'Communication Tools',       'message-circle', 14),
  ('TRANSPORT_MATERIALS', 'Transport & Logistics',     'map-pin',     15),
  ('MEDIA_PRODUCTION',    'Media Production',          'video',       16),
  ('MISCELLANEOUS',       'Miscellaneous',             'package',     17)
ON CONFLICT (code) DO NOTHING;
