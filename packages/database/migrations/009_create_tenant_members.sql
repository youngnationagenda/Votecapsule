-- Vote Capsule™ Migration 009
-- Creates tenant_members table
-- Domain: Foundation / Tenant

CREATE TABLE IF NOT EXISTS tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id),
  status      VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  joined_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_role_id ON tenant_members(role_id);

COMMENT ON TABLE tenant_members IS 'Users belonging to tenants — enforces multi-tenant isolation';
