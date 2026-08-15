-- Vote Capsule™ Migration 133
-- Seeds the 4 pricing plans for the billing service
-- Domain: Billing
-- Dependency: Billing service pricing_plans table (TypeORM auto-synced)

INSERT INTO pricing_plans (id, name, code, description, currency, price_monthly, price_yearly, setup_fee, max_elections, max_agents, max_polling_stations, max_capsules_per_election, max_users, max_storage_gb, features, is_active, is_public, sort_order, created_at, updated_at)
VALUES
  (
    'c0000001-0000-4000-8000-000000000001',
    'Candidate Plan',
    'candidate',
    'Pay per polling station — ideal for individual candidates. KES 500–3,000 per position. Super Admin sets the price.',
    'KES',
    0,  -- custom pricing per agreement
    0,
    0,
    1,    -- 1 election at a time
    10,   -- up to 10 agents
    NULL, -- set per agreement (stationCount)
    NULL,
    10,   -- up to 10 users
    5,    -- 5 GB storage
    '["evidence_capture","real_time_tallying","agent_assignment","geo_fencing","basic_reporting"]'::jsonb,
    TRUE,
    TRUE,
    1,
    NOW(),
    NOW()
  ),
  (
    'c0000001-0000-4000-8000-000000000002',
    'Political Party Plan',
    'party',
    'Per polling station OR county lump sum — flexible pricing for political parties. Supports multi-candidate sponsorship.',
    'KES',
    0,
    0,
    0,
    NULL, -- unlimited elections
    NULL, -- unlimited agents
    NULL, -- set per agreement
    NULL,
    NULL, -- unlimited users
    50,   -- 50 GB storage
    '["evidence_capture","real_time_tallying","agent_assignment","geo_fencing","advanced_reporting","multi_candidate","county_coverage","nominations","priority_support","party_analytics"]'::jsonb,
    TRUE,
    TRUE,
    2,
    NOW(),
    NOW()
  ),
  (
    'c0000001-0000-4000-8000-000000000003',
    'Observer Plan',
    'observer',
    'Per polling station with advanced reporting, unlimited users and agents. For observer organizations.',
    'KES',
    0,
    0,
    0,
    NULL,
    NULL, -- unlimited agents
    NULL,
    NULL,
    NULL, -- unlimited users
    100,  -- 100 GB storage
    '["evidence_capture","real_time_monitoring","advanced_reporting","cross_county_comparison","evidence_verification","api_access","custom_dashboards","unlimited_users","unlimited_agents"]'::jsonb,
    TRUE,
    TRUE,
    3,
    NOW(),
    NOW()
  ),
  (
    'c0000001-0000-4000-8000-000000000004',
    'Third Party Plan',
    'authority',
    'Lump sum data access — for institutions, media houses, NGOs, law firms, and government bodies. KES 1M–200M.',
    'KES',
    0,
    0,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    500,  -- 500 GB storage
    '["full_data_access","cross_reference","legal_evidence_export","unlimited_users","sla_guarantee","dedicated_support","custom_integrations","api_access","audit_trail"]'::jsonb,
    TRUE,
    TRUE,
    4,
    NOW(),
    NOW()
  )
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  features    = EXCLUDED.features,
  is_active   = TRUE,
  sort_order  = EXCLUDED.sort_order,
  updated_at  = NOW();

-- Remove old plans that no longer apply
UPDATE pricing_plans SET is_active = FALSE, is_public = FALSE, updated_at = NOW()
WHERE code IN ('starter', 'professional', 'enterprise', 'platform')
  AND code NOT IN ('candidate', 'party', 'observer', 'authority');
