-- Vote Capsule™ Migration 004
-- Creates the roles and permissions tables
-- Domain: Foundation / Identity

CREATE TABLE IF NOT EXISTS roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) UNIQUE NOT NULL,
  display_name  VARCHAR(150),
  description   TEXT,
  level         VARCHAR(50) CHECK (level IN ('platform', 'tenant', 'geography')),
  is_system     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system) WHERE is_system = TRUE;

COMMENT ON TABLE roles IS 'Platform roles — defines business responsibilities';
COMMENT ON COLUMN roles.is_system IS 'System roles cannot be deleted — they are seeded at platform initialization';

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    VARCHAR(100) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  scope       VARCHAR(50) DEFAULT 'own' CHECK (scope IN ('own', 'tenant', 'geography', 'global')),
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource, action, scope)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

COMMENT ON TABLE permissions IS 'Granular platform permissions — resource + action + scope';

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

COMMENT ON TABLE role_permissions IS 'Many-to-many: roles have many permissions';
