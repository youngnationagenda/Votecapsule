-- Vote Capsule™ Migration 010
-- Creates subscriptions and tenant_settings tables
-- Domain: Foundation / Tenant / Commercial

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan            VARCHAR(100) NOT NULL CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status          VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  billing_cycle   VARCHAR(50) CHECK (billing_cycle IN ('monthly', 'annual', 'election')),
  starts_at       TIMESTAMP NOT NULL,
  ends_at         TIMESTAMP,
  max_users       INTEGER,
  max_elections   INTEGER,
  features        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);

COMMENT ON TABLE subscriptions IS 'Tenant subscription and licensing records';
COMMENT ON COLUMN subscriptions.features IS 'Feature flags enabled for this subscription tier';

CREATE TABLE IF NOT EXISTS tenant_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,
  value       JSONB NOT NULL,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON tenant_settings(key);

COMMENT ON TABLE tenant_settings IS 'Key-value configuration settings per tenant';
