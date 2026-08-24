-- ============================================================
-- VoteCapsule™ Migration 142
-- Campaign Supplier Products table
-- Links scraped supplier catalogue to campaign_material_types
-- Dependency: 135_campaign_schema_phase_14b.sql (suppliers table)
-- ============================================================

BEGIN;

-- Add missing columns to campaign_suppliers if they don't exist
-- (The table was created in 135 but import_supplier_products.js expects
--  website + location columns with a UNIQUE constraint on website)
ALTER TABLE campaign_suppliers
  ADD COLUMN IF NOT EXISTS website     VARCHAR(300),
  ADD COLUMN IF NOT EXISTS location    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS metadata    JSONB NOT NULL DEFAULT '{}';

-- Add UNIQUE on website so ON CONFLICT works in the import script
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_website
  ON campaign_suppliers(website)
  WHERE website IS NOT NULL;

-- Add thumbnail_url to campaign_material_types for scraped images
ALTER TABLE campaign_material_types
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(1000);

-- ─────────────────────────────────────────────────────────────
-- CAMPAIGN SUPPLIER PRODUCTS
-- Scraped product listings from supplier websites
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_supplier_products (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id             UUID         NOT NULL REFERENCES campaign_suppliers(id) ON DELETE CASCADE,
    material_type_id        UUID         REFERENCES campaign_material_types(id),
    -- Supplier-side product fields
    supplier_product_name   VARCHAR(500) NOT NULL,
    supplier_sku            VARCHAR(100),
    unit_price              DECIMAL(12,2),
    bulk_price              DECIMAL(12,2),
    bulk_min_quantity       INT,
    currency                CHAR(3)      NOT NULL DEFAULT 'KES',
    product_url             VARCHAR(1000),
    image_url               VARCHAR(1000),
    description             TEXT,
    specifications          JSONB        NOT NULL DEFAULT '{}',
    is_available            BOOLEAN      NOT NULL DEFAULT TRUE,
    lead_time_days          SMALLINT     NOT NULL DEFAULT 14,
    metadata                JSONB        NOT NULL DEFAULT '{}',
    scraped_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- One supplier product per material type per supplier
    UNIQUE (supplier_id, material_type_id)
);

CREATE INDEX IF NOT EXISTS idx_csp_supplier  ON campaign_supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_csp_material  ON campaign_supplier_products(material_type_id);
CREATE INDEX IF NOT EXISTS idx_csp_available ON campaign_supplier_products(is_available);

-- ─────────────────────────────────────────────────────────────
-- CAMPAIGN SUPPLIER PRODUCTS UNMATCHED
-- Products scraped but not matched to any material type
-- For manual review and re-processing
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_supplier_products_unmatched (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id     UUID         NOT NULL REFERENCES campaign_suppliers(id) ON DELETE CASCADE,
    product_name    VARCHAR(500) NOT NULL,
    product_data    JSONB        NOT NULL DEFAULT '{}',
    reviewed        BOOLEAN      NOT NULL DEFAULT FALSE,
    matched_to      UUID         REFERENCES campaign_material_types(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (supplier_id, product_name)
);

-- ─────────────────────────────────────────────────────────────
-- Seed KaziSafi Branding supplier
INSERT INTO campaign_suppliers (
    tenant_id, company_name, contact_name, contact_email,
    county_code, address, capabilities, lead_time_days,
    quality_rating, delivery_reliability, is_active,
    website, location, notes
)
SELECT
    t.id, 'KaziSafi Branding', 'KaziSafi Sales Team', 'info@kazisafibranding.co.ke',
    '047', 'Nairobi, Kenya',
    ARRAY['BRANDED_CLOTHING','PRINTED_MATERIALS','PROMOTIONAL_ITEMS','OUTDOOR_ADVERTISING','EVENT_SUPPLIES'],
    14, 4.00, 85.00, TRUE,
    'https://kazisafibranding.co.ke/', 'Nairobi, Kenya',
    'Primary branded merchandise supplier'
FROM (SELECT id FROM tenants WHERE type = 'political_party'
      AND status = 'active' ORDER BY created_at LIMIT 1) t
ON CONFLICT DO NOTHING;

COMMIT;
