-- Vote Capsule™ Migration 008
-- Creates tenants table
-- Domain: Foundation / Tenant

CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  type            VARCHAR(100) NOT NULL CHECK (type IN (
                    'election_authority', 'political_party', 'observer',
                    'media', 'independent_candidate', 'civil_society', 'government_agency'
                  )),
  status          VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated', 'pending')),
  country_code    VARCHAR(10) DEFAULT 'KE',
  logo_url        TEXT,
  primary_color   VARCHAR(7),            -- Organization accent color (hex) — for branding within org portal only
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  settings        JSONB DEFAULT '{}',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(type);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE tenants IS 'Customer organizations using the Vote Capsule platform';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier — used in portal routing';
COMMENT ON COLUMN tenants.primary_color IS 'Org accent color used only within org-specific branding — NEVER affects platform theme';
COMMENT ON COLUMN tenants.settings IS 'JSONB bag for tenant-specific configuration';
