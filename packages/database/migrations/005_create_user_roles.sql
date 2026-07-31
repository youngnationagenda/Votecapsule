-- Vote Capsule™ Migration 005
-- Creates user_roles table
-- Domain: Foundation / Identity

CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id   UUID,         -- NULL = platform-level role assignment
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP,
  UNIQUE(user_id, role_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE user_roles IS 'User-to-role assignments within a tenant context';
COMMENT ON COLUMN user_roles.tenant_id IS 'NULL = platform-level role; non-NULL = scoped to that tenant';
