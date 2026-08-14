-- Vote Capsule™ Migration 132
-- Seeds system roles used by the platform
-- Domain: Identity / RBAC
-- Dependency: 004_create_roles.sql

INSERT INTO roles (id, name, display_name, description, level, is_system)
VALUES
  ('a0000001-0000-4000-8000-000000000001', 'CAPSULE_AGENT',        'Field Agent',          'Field agent who captures polling station evidence',  'tenant',   TRUE),
  ('a0000001-0000-4000-8000-000000000002', 'VALIDATOR',            'Validator',             'Reviews and approves/rejects captured capsules',     'tenant',   TRUE),
  ('a0000001-0000-4000-8000-000000000003', 'OBSERVER',             'Observer',              'Election observer — read-only access',               'tenant',   TRUE),
  ('a0000001-0000-4000-8000-000000000004', 'CANDIDATE',            'Candidate',             'Registered electoral candidate',                     'tenant',   TRUE),
  ('a0000001-0000-4000-8000-000000000005', 'PARTY_ADMIN',          'Party Admin',           'Political party administrator',                      'tenant',   TRUE),
  ('a0000001-0000-4000-8000-000000000006', 'TENANT_ADMIN',         'Tenant Admin',          'Tenant-level administrator',                         'tenant',   TRUE),
  ('a0000001-0000-4000-8000-000000000007', 'ELECTION_AUTHORITY',   'Election Authority',    'Election authority staff (IEBC)',                    'platform', TRUE),
  ('a0000001-0000-4000-8000-000000000008', 'RETURNING_OFFICER',    'Returning Officer',     'Constituency returning officer',                     'geography', TRUE),
  ('a0000001-0000-4000-8000-000000000009', 'SUPPORT_ADMIN',        'Support Admin',         'Platform support administrator',                     'platform', TRUE),
  ('a0000001-0000-4000-8000-00000000000a', 'PLATFORM_SUPER_ADMIN', 'Super Admin',           'Full platform super administrator',                  'platform', TRUE)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  level        = EXCLUDED.level,
  is_system    = TRUE;

-- Seed core permissions
INSERT INTO permissions (id, resource, action, scope, description)
VALUES
  -- Evidence
  ('b0000001-0000-4000-8000-000000000001', 'capsules',    'create',  'own',      'Capture evidence capsules'),
  ('b0000001-0000-4000-8000-000000000002', 'capsules',    'read',    'tenant',   'View capsules within tenant'),
  ('b0000001-0000-4000-8000-000000000003', 'capsules',    'validate','tenant',   'Approve/reject capsules'),
  ('b0000001-0000-4000-8000-000000000004', 'capsules',    'read',    'global',   'View all capsules platform-wide'),
  -- Users
  ('b0000001-0000-4000-8000-000000000005', 'users',       'manage',  'tenant',   'Manage users within tenant'),
  ('b0000001-0000-4000-8000-000000000006', 'users',       'manage',  'global',   'Manage all platform users'),
  -- Tenants
  ('b0000001-0000-4000-8000-000000000007', 'tenants',     'manage',  'own',      'Manage own tenant settings'),
  ('b0000001-0000-4000-8000-000000000008', 'tenants',     'manage',  'global',   'Manage all tenants'),
  -- Elections
  ('b0000001-0000-4000-8000-000000000009', 'elections',   'manage',  'global',   'Create and manage elections'),
  ('b0000001-0000-4000-8000-00000000000a', 'elections',   'read',    'global',   'View election results'),
  -- Nominations
  ('b0000001-0000-4000-8000-00000000000b', 'nominations', 'manage',  'tenant',   'Manage party nominations'),
  ('b0000001-0000-4000-8000-00000000000c', 'nominations', 'read',    'own',      'View own nomination status')
ON CONFLICT (resource, action, scope) DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
VALUES
  -- CAPSULE_AGENT: capture + read own
  ('a0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000001'),
  ('a0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000002'),
  -- VALIDATOR: read + validate tenant capsules
  ('a0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000002'),
  ('a0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000003'),
  -- OBSERVER: read capsules
  ('a0000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000002'),
  ('a0000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-00000000000a'),
  -- PARTY_ADMIN: manage users + nominations within tenant
  ('a0000001-0000-4000-8000-000000000005', 'b0000001-0000-4000-8000-000000000005'),
  ('a0000001-0000-4000-8000-000000000005', 'b0000001-0000-4000-8000-000000000007'),
  ('a0000001-0000-4000-8000-000000000005', 'b0000001-0000-4000-8000-00000000000b'),
  -- TENANT_ADMIN: manage users + tenant settings
  ('a0000001-0000-4000-8000-000000000006', 'b0000001-0000-4000-8000-000000000005'),
  ('a0000001-0000-4000-8000-000000000006', 'b0000001-0000-4000-8000-000000000007'),
  -- ELECTION_AUTHORITY: manage elections + read all capsules
  ('a0000001-0000-4000-8000-000000000007', 'b0000001-0000-4000-8000-000000000004'),
  ('a0000001-0000-4000-8000-000000000007', 'b0000001-0000-4000-8000-000000000009'),
  ('a0000001-0000-4000-8000-000000000007', 'b0000001-0000-4000-8000-00000000000a'),
  -- PLATFORM_SUPER_ADMIN: everything
  ('a0000001-0000-4000-8000-00000000000a', 'b0000001-0000-4000-8000-000000000004'),
  ('a0000001-0000-4000-8000-00000000000a', 'b0000001-0000-4000-8000-000000000006'),
  ('a0000001-0000-4000-8000-00000000000a', 'b0000001-0000-4000-8000-000000000008'),
  ('a0000001-0000-4000-8000-00000000000a', 'b0000001-0000-4000-8000-000000000009')
ON CONFLICT DO NOTHING;
