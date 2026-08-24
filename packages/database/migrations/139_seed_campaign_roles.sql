-- ============================================================
-- VoteCapsule™ Migration 139
-- Seed campaign-specific roles
-- Dependency: 132_seed_system_roles.sql, 138_campaign_permissions_seed.sql
-- ============================================================

BEGIN;

-- ── 1. Campaign roles ─────────────────────────────────────────

INSERT INTO roles (name, display_name, description, level, is_system)
VALUES
  ('PARTY_CAMPAIGN_DIRECTOR',     'Campaign Director',        'Full visibility across all party campaigns',       'tenant', TRUE),
  ('CANDIDATE_CAMPAIGN_PRINCIPAL','Campaign Principal',       'Candidate — own campaign and geography only',      'tenant', TRUE),
  ('CAMPAIGN_MANAGER',            'Campaign Manager',         'Manages assigned campaign operations',             'tenant', TRUE),
  ('CONSTITUENCY_COORDINATOR',    'Constituency Coordinator', 'Coordinates within assigned constituency',         'tenant', TRUE),
  ('WARD_COORDINATOR',            'Ward Coordinator',         'Coordinates within assigned ward only',            'tenant', TRUE),
  ('LOGISTICS_OFFICER',           'Logistics Officer',        'Manages vehicles and equipment',                   'tenant', TRUE),
  ('FINANCE_OFFICER',             'Finance Officer',          'Manages campaign budget and expenses',             'tenant', TRUE),
  ('COMMUNICATIONS_OFFICER',      'Communications Officer',   'Manages SMS and campaign communications',          'tenant', TRUE),
  ('BRAND_MANAGER',               'Brand Manager',            'Manages designs and brand assets',                 'tenant', TRUE),
  ('CAMPAIGN_VOLUNTEER',          'Campaign Volunteer',       'View assigned tasks and confirm attendance only',  'tenant', TRUE)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  level        = EXCLUDED.level,
  is_system    = TRUE;

-- ── 2. Campaign permissions ───────────────────────────────────
-- scope must be one of: own | tenant | geography | global

INSERT INTO permissions (resource, action, scope, description)
VALUES
  ('campaigns',           'create',  'tenant',      'Create a campaign'),
  ('campaigns',           'read',    'tenant',      'View all campaigns in tenant'),
  ('campaigns',           'read',    'own',         'View own campaign only'),
  ('campaigns',           'update',  'tenant',      'Update any campaign in tenant'),
  ('campaigns',           'update',  'own',         'Update own campaign only'),
  ('campaign_events',     'manage',  'tenant',      'Manage all campaign events'),
  ('campaign_events',     'manage',  'geography',   'Manage events in assigned geography'),
  ('campaign_events',     'read',    'geography',   'View events in assigned geography'),
  ('campaign_budget',     'manage',  'own',         'Manage campaign budget'),
  ('campaign_budget',     'read',    'own',         'View campaign budget'),
  ('campaign_sms',        'send',    'own',         'Send SMS to campaign team'),
  ('campaign_sms',        'read',    'own',         'View SMS history'),
  ('campaign_logistics',  'manage',  'own',         'Manage vehicles and equipment'),
  ('campaign_volunteers', 'manage',  'geography',   'Manage volunteers in own geography'),
  ('campaign_tasks',      'manage',  'own',         'Manage campaign tasks'),
  ('campaign_tasks',      'read',    'own',         'View own tasks'),
  ('campaign_materials',  'manage',  'own',         'Manage campaign materials and orders'),
  ('campaign_materials',  'read',    'own',         'View campaign materials'),
  ('campaign_designs',    'manage',  'own',         'Manage campaign designs and mockups'),
  ('campaign_outdoor',    'manage',  'own',         'Manage outdoor placements'),
  ('campaign_outdoor',    'read',    'geography',   'View outdoor placements in geography')
ON CONFLICT (resource, action, scope) DO NOTHING;

-- ── 3. Wire PARTY_CAMPAIGN_DIRECTOR: full tenant campaign access ─

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'PARTY_CAMPAIGN_DIRECTOR'
  AND p.resource IN (
    'campaigns','campaign_events','campaign_budget','campaign_sms',
    'campaign_logistics','campaign_volunteers','campaign_tasks',
    'campaign_materials','campaign_designs','campaign_outdoor'
  )
ON CONFLICT DO NOTHING;

-- ── 4. Wire CAMPAIGN_MANAGER: own-campaign access ────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'CAMPAIGN_MANAGER'
  AND p.scope IN ('own', 'geography')
  AND p.resource IN (
    'campaigns','campaign_events','campaign_budget','campaign_sms',
    'campaign_logistics','campaign_volunteers','campaign_tasks',
    'campaign_materials','campaign_designs','campaign_outdoor'
  )
ON CONFLICT DO NOTHING;

-- ── 5. Wire WARD_COORDINATOR ─────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'WARD_COORDINATOR'
  AND p.resource IN ('campaign_events','campaign_tasks','campaign_volunteers','campaign_outdoor')
  AND p.scope IN ('geography','own')
ON CONFLICT DO NOTHING;

-- ── 6. Wire CONSTITUENCY_COORDINATOR ─────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'CONSTITUENCY_COORDINATOR'
  AND p.resource IN ('campaign_events','campaign_tasks','campaign_volunteers','campaign_outdoor')
  AND p.scope IN ('geography','own')
ON CONFLICT DO NOTHING;

-- ── 7. Wire LOGISTICS_OFFICER ────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'LOGISTICS_OFFICER'
  AND p.resource = 'campaign_logistics'
ON CONFLICT DO NOTHING;

-- ── 8. Wire FINANCE_OFFICER ──────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'FINANCE_OFFICER'
  AND p.resource = 'campaign_budget'
ON CONFLICT DO NOTHING;

-- ── 9. Wire COMMUNICATIONS_OFFICER ───────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'COMMUNICATIONS_OFFICER'
  AND p.resource = 'campaign_sms'
ON CONFLICT DO NOTHING;

-- ── 10. Wire BRAND_MANAGER ───────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'BRAND_MANAGER'
  AND p.resource IN ('campaign_materials','campaign_designs')
ON CONFLICT DO NOTHING;

-- ── 11. Wire CAMPAIGN_VOLUNTEER ──────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'CAMPAIGN_VOLUNTEER'
  AND p.resource = 'campaign_tasks'
  AND p.scope IN ('assigned','own')
ON CONFLICT DO NOTHING;

COMMIT;
