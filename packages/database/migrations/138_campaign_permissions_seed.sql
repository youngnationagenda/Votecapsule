-- ============================================================
-- VoteCapsule™ — Migration 138
-- Campaign resource permissions + seed demo campaign data
-- ============================================================

BEGIN;

-- ── 1. Add 'campaign' resource permissions ──────────────────

-- PLATFORM_SUPER_ADMIN: full global CRUD on campaigns
INSERT INTO permissions (resource, action, scope, description)
VALUES
  ('campaign', 'create', 'global', 'Create campaigns for any tenant'),
  ('campaign', 'read',   'global', 'Read all campaigns across tenants'),
  ('campaign', 'update', 'global', 'Update any campaign'),
  ('campaign', 'delete', 'global', 'Delete any campaign'),
  ('campaign', 'manage', 'global', 'Full campaign management — status, budget, teams')
ON CONFLICT DO NOTHING;

-- PARTY_ADMIN: own-tenant campaign CRUD
INSERT INTO permissions (resource, action, scope, description)
VALUES
  ('campaign', 'create', 'own',    'Create campaigns for own tenant'),
  ('campaign', 'read',   'tenant', 'Read own tenant campaigns'),
  ('campaign', 'update', 'own',    'Update own tenant campaigns')
ON CONFLICT DO NOTHING;

-- CANDIDATE: read-only own campaigns
INSERT INTO permissions (resource, action, scope, description)
VALUES
  ('campaign', 'read', 'own', 'Read own candidate campaigns')
ON CONFLICT DO NOTHING;

-- ── 2. Wire permissions to roles ────────────────────────────

-- PLATFORM_SUPER_ADMIN gets all global campaign permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'PLATFORM_SUPER_ADMIN'
  AND p.resource = 'campaign'
  AND p.scope = 'global'
ON CONFLICT DO NOTHING;

-- PARTY_ADMIN gets own/tenant campaign permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'PARTY_ADMIN'
  AND p.resource = 'campaign'
  AND p.scope IN ('own', 'tenant')
ON CONFLICT DO NOTHING;

-- CANDIDATE gets own read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'CANDIDATE'
  AND p.resource = 'campaign'
  AND p.action = 'read'
  AND p.scope = 'own'
ON CONFLICT DO NOTHING;

-- ── 3. Seed demo campaign data (uses real party tenant IDs) ──

-- Seed 3 demo campaigns linked to existing party tenants
-- Uses the first 3 party tenants in the DB
DO $$
DECLARE
  v_tenant1 UUID;
  v_tenant2 UUID;
  v_tenant3 UUID;
  v_camp1   UUID := gen_random_uuid();
  v_camp2   UUID := gen_random_uuid();
  v_camp3   UUID := gen_random_uuid();
  v_event1  UUID := gen_random_uuid();
  v_event2  UUID := gen_random_uuid();
  v_task1   UUID := gen_random_uuid();
  v_task2   UUID := gen_random_uuid();
  v_task3   UUID := gen_random_uuid();
  v_team1   UUID := gen_random_uuid();
  v_budget1 UUID := gen_random_uuid();
BEGIN
  -- Get first 3 party tenants
  SELECT id INTO v_tenant1 FROM tenants WHERE type = 'political_party' AND status = 'active' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_tenant2 FROM tenants WHERE type = 'political_party' AND status = 'active' ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_tenant3 FROM tenants WHERE type = 'political_party' AND status = 'active' ORDER BY created_at LIMIT 1 OFFSET 2;

  IF v_tenant1 IS NULL THEN RETURN; END IF;

  -- Campaign 1: Active flagship campaign
  INSERT INTO campaigns (id, tenant_id, candidate_id, election_id, party_id, name, description, status,
    campaign_start_date, campaign_end_date, county_code, constituency_code, target_wards, goals, created_by)
  VALUES (
    v_camp1, v_tenant1,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    v_tenant1,
    'Nairobi MP Kasarani 2027 Campaign',
    'Flagship campaign for MP seat in Kasarani Constituency — Kenya 2027 General Election',
    'active',
    '2027-01-15', '2027-08-08',
    '047', '270',
    '["270001","270002","270003","270004","270005"]'::jsonb,
    '{"targetVoters": 80000, "targetTurnout": 0.72, "budgetKes": 5000000}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ) ON CONFLICT DO NOTHING;

  -- Campaign 2: Planning stage
  IF v_tenant2 IS NOT NULL THEN
    INSERT INTO campaigns (id, tenant_id, candidate_id, election_id, party_id, name, description, status,
      campaign_start_date, county_code, constituency_code, target_wards, goals, created_by)
    VALUES (
      v_camp2, v_tenant2,
      '00000000-0000-0000-0000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      v_tenant2,
      'Mombasa Governor 2027 Campaign',
      'County Governor campaign for Mombasa County',
      'planning',
      '2027-02-01',
      '001', '001',
      '["0101","0102","0103"]'::jsonb,
      '{"targetVoters": 50000, "targetTurnout": 0.65, "budgetKes": 8000000}'::jsonb,
      '00000000-0000-0000-0000-000000000001'::uuid
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Campaign 3: Suspended
  IF v_tenant3 IS NOT NULL THEN
    INSERT INTO campaigns (id, tenant_id, candidate_id, election_id, party_id, name, description, status,
      campaign_start_date, county_code, target_wards, goals, created_by)
    VALUES (
      v_camp3, v_tenant3,
      '00000000-0000-0000-0000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      v_tenant3,
      'Kisumu Senator 2027 Campaign',
      'Senator campaign for Kisumu County',
      'suspended',
      '2026-12-01',
      '042',
      '[]'::jsonb,
      '{"targetVoters": 30000, "budgetKes": 3000000}'::jsonb,
      '00000000-0000-0000-0000-000000000001'::uuid
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Events for Campaign 1
  INSERT INTO campaign_events (id, campaign_id, tenant_id, event_name, event_type, event_category,
    start_time, end_time, venue_name, county_code, constituency_code, ward_code, expected_attendance,
    budget_estimate, status, requires_pa_system, requires_stage, created_by)
  VALUES
    (v_event1, v_camp1, v_tenant1, 'Kasarani Constituency Rally', 'RALLY', 'CAMPAIGN',
     '2027-03-15 10:00:00+03', '2027-03-15 14:00:00+03',
     'Mwiki Grounds, Kasarani', '047', '270', '2700', 5000,
     250000, 'scheduled', true, true,
     '00000000-0000-0000-0000-000000000001'::uuid),
    (v_event2, v_camp1, v_tenant1, 'Mwiki Ward Door-to-Door Drive', 'DOOR_TO_DOOR', 'CAMPAIGN',
     '2027-03-20 08:00:00+03', '2027-03-20 17:00:00+03',
     'Mwiki Ward', '047', '270', '2700', 200,
     50000, 'scheduled', false, false,
     '00000000-0000-0000-0000-000000000001'::uuid)
  ON CONFLICT DO NOTHING;

  -- Tasks for Campaign 1
  INSERT INTO campaign_tasks (id, campaign_id, tenant_id, title, description, priority, status,
    due_date, county_code, created_by)
  VALUES
    (v_task1, v_camp1, v_tenant1, 'Register 500 new voters in Mwiki Ward', 'Target voter registration drive in Mwiki Ward before deadline', 'high', 'in_progress', '2027-04-01 23:59:00+03', '047', '00000000-0000-0000-0000-000000000001'::uuid),
    (v_task2, v_camp1, v_tenant1, 'Print 10,000 campaign flyers', 'Order and distribute branded flyers for Kasarani constituency', 'medium', 'todo', '2027-03-10 23:59:00+03', '047', '00000000-0000-0000-0000-000000000001'::uuid),
    (v_task3, v_camp1, v_tenant1, 'Coordinate with 47 polling agents', 'Confirm all 47 assigned agents have received briefing materials', 'critical', 'todo', '2027-07-01 23:59:00+03', '047', '00000000-0000-0000-0000-000000000001'::uuid)
  ON CONFLICT DO NOTHING;

  -- Team for Campaign 1
  INSERT INTO campaign_teams (id, campaign_id, tenant_id, team_name, team_type, team_leader_name,
    county_code, constituency_code, is_active, created_by)
  VALUES (
    v_team1, v_camp1, v_tenant1, 'Kasarani Constituency Team', 'CONSTITUENCY', 'John Kamau',
    '047', '270', true,
    '00000000-0000-0000-0000-000000000001'::uuid
  ) ON CONFLICT DO NOTHING;

  -- Budget for Campaign 1
  INSERT INTO campaign_budgets (id, campaign_id, tenant_id, total_allocated, total_committed, total_spent,
    iebc_spending_limit, currency, fiscal_year, created_by)
  VALUES (
    v_budget1, v_camp1, v_tenant1,
    5000000, 500000, 320000,
    4000000, 'KES', 2027,
    '00000000-0000-0000-0000-000000000001'::uuid
  ) ON CONFLICT DO NOTHING;

  -- Budget categories for Campaign 1
  INSERT INTO campaign_budget_categories (budget_id, campaign_id, tenant_id, category_code, category_name, allocated, committed, spent)
  VALUES
    (v_budget1, v_camp1, v_tenant1, 'transport', 'Transport & Fuel', 800000, 100000, 80000),
    (v_budget1, v_camp1, v_tenant1, 'printing', 'Printing & Materials', 600000, 200000, 150000),
    (v_budget1, v_camp1, v_tenant1, 'events', 'Events & Rallies', 1500000, 150000, 90000),
    (v_budget1, v_camp1, v_tenant1, 'communications', 'Communications & SMS', 400000, 50000, 0),
    (v_budget1, v_camp1, v_tenant1, 'personnel', 'Personnel & Allowances', 1200000, 0, 0),
    (v_budget1, v_camp1, v_tenant1, 'other', 'Other', 500000, 0, 0)
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
