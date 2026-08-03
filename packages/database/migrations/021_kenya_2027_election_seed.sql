-- ============================================================
-- VoteCapsule™ — Kenya 2027 General Election Seed Data
-- Migration: 021_kenya_2027_election_seed.sql
--
-- Seeds:
--     1 election record  (Kenya General Election 2027)
--     1 PRESIDENT position (national)
--    47 GOVERNOR positions (one per county)
--    47 SENATOR positions (one per county)
--    47 WOMEN_REP positions (one per county)
--   292 MP positions (one per constituency)
-- 1,447 MCA positions (one per ward — County Assembly)
-- ─────────────────────────────────────────────────────────────
-- Total elective positions: 1,881
-- Major political parties (UDA, ODM, Jubilee, Wiper, ANC, Ford-K)
--
-- Uses DO block + NEC iebc_codes as FK references.
-- Idempotent: skips if election already exists.
-- ============================================================

DO $$
DECLARE
  v_election_id UUID;
  v_iebc_tenant_id UUID;
  v_admin_user_id  UUID := '2b4b18c5-4a52-4e90-b641-8ada0b5a50bc';
BEGIN

  -- ── Upsert IEBC tenant ──────────────────────────────────────
  INSERT INTO identity_tenants (
    id, name, slug, type, status, country, created_at, updated_at
  ) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Independent Electoral and Boundaries Commission (IEBC)',
    'iebc',
    'election_authority',
    'active',
    'KEN',
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  v_iebc_tenant_id := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  -- ── Create Kenya 2027 General Election ──────────────────────
  -- Idempotent: skip if already exists for this tenant + year + type
  IF NOT EXISTS (
    SELECT 1 FROM candidate_elections
    WHERE tenant_id = v_iebc_tenant_id
      AND election_year = 2027
      AND election_type = 'GENERAL'
  ) THEN
    INSERT INTO candidate_elections (
      id, tenant_id, name, election_type, election_year,
      election_date, nomination_deadline, campaign_start_date, campaign_end_date,
      gazette_reference, description, status, nec_election_year, is_active,
      created_by, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_iebc_tenant_id,
      'Kenya General Election 2027',
      'GENERAL',
      2027,
      '2027-08-10',       -- Election Day: second Tuesday of August 2027
      '2027-05-31',       -- Nomination deadline: IEBC gazette
      '2027-06-01',       -- Campaign opens
      '2027-08-08',       -- Campaign ends (2 days before election day)
      'Kenya Gazette Supplement No. 1 of 2027',
      'Kenya''s 5th general election under the 2010 Constitution. '
      'Voters elect President, 47 Governors, 47 Senators, 47 Women Representatives, '
      '290 Members of National Assembly, and 1,450 Ward Representatives (MCAs).',
      'PLANNING',
      2027,
      FALSE,
      v_admin_user_id,
      NOW(), NOW()
    );
  END IF;

  -- Get the election ID
  SELECT id INTO v_election_id
  FROM candidate_elections
  WHERE tenant_id = v_iebc_tenant_id
    AND election_year = 2027
    AND election_type = 'GENERAL';

  -- ── PRESIDENT (1 — national) ─────────────────────────────────
  INSERT INTO candidate_election_positions (
    election_id, position_code, position_name, geographic_level,
    county_code, constituency_code, ward_code,
    iebc_form_number, is_running_mate_required, seats_available, sort_order,
    description, created_at, updated_at
  )
  SELECT
    v_election_id, 'PRESIDENT', 'President of the Republic of Kenya', 'NATIONAL',
    NULL, NULL, NULL,
    'Form 32A', TRUE, 1, 1,
    'National election for President and Deputy President of Kenya',
    NOW(), NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM candidate_election_positions
    WHERE election_id = v_election_id AND position_code = 'PRESIDENT'
  );


  -- ── GOVERNOR (47 counties) ──────────────────────────────────
  -- One Governor per county, elected by county registered voters
  INSERT INTO candidate_election_positions (
    election_id, position_code, position_name, geographic_level,
    county_code, constituency_code, ward_code,
    iebc_form_number, is_running_mate_required, seats_available, sort_order,
    description, created_at, updated_at
  )
  SELECT
    v_election_id,
    'GOVERNOR',
    'Governor - ' || nc.name,
    'COUNTY',
    nc.iebc_code,
    NULL, NULL,
    'Form 37B', FALSE, 1, 10,
    'County Governor for ' || nc.name || ' County',
    NOW(), NOW()
  FROM nec_counties nc
  WHERE nc.is_special = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM candidate_election_positions
      WHERE election_id = v_election_id
        AND position_code = 'GOVERNOR'
        AND county_code = nc.iebc_code
    );

  -- ── SENATOR (47 counties) ───────────────────────────────────
  INSERT INTO candidate_election_positions (
    election_id, position_code, position_name, geographic_level,
    county_code, constituency_code, ward_code,
    iebc_form_number, is_running_mate_required, seats_available, sort_order,
    description, created_at, updated_at
  )
  SELECT
    v_election_id,
    'SENATOR',
    'Senator - ' || nc.name,
    'COUNTY',
    nc.iebc_code,
    NULL, NULL,
    'Form 38B', FALSE, 1, 20,
    'Senator for ' || nc.name || ' County',
    NOW(), NOW()
  FROM nec_counties nc
  WHERE nc.is_special = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM candidate_election_positions
      WHERE election_id = v_election_id
        AND position_code = 'SENATOR'
        AND county_code = nc.iebc_code
    );

  -- ── WOMEN_REP (47 counties) ─────────────────────────────────
  INSERT INTO candidate_election_positions (
    election_id, position_code, position_name, geographic_level,
    county_code, constituency_code, ward_code,
    iebc_form_number, is_running_mate_required, seats_available, sort_order,
    description, created_at, updated_at
  )
  SELECT
    v_election_id,
    'WOMEN_REP',
    'Women Representative - ' || nc.name,
    'COUNTY',
    nc.iebc_code,
    NULL, NULL,
    'Form 38B', FALSE, 1, 30,
    'Women Representative (National Assembly) for ' || nc.name || ' County',
    NOW(), NOW()
  FROM nec_counties nc
  WHERE nc.is_special = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM candidate_election_positions
      WHERE election_id = v_election_id
        AND position_code = 'WOMEN_REP'
        AND county_code = nc.iebc_code
    );

  -- ── MP / Member of National Assembly (290 constituencies) ──
  INSERT INTO candidate_election_positions (
    election_id, position_code, position_name, geographic_level,
    county_code, constituency_code, ward_code,
    iebc_form_number, is_running_mate_required, seats_available, sort_order,
    description, created_at, updated_at
  )
  SELECT
    v_election_id,
    'MP',
    'Member of National Assembly - ' || nc2.name,
    'CONSTITUENCY',
    nc2.county_code,
    nc2.iebc_code,
    NULL,
    'Form 35B', FALSE, 1, 40,
    'Member of National Assembly for ' || nc2.name || ' Constituency',
    NOW(), NOW()
  FROM nec_constituencies nc2
  WHERE NOT EXISTS (
    SELECT 1 FROM candidate_election_positions
    WHERE election_id = v_election_id
      AND position_code = 'MP'
      AND constituency_code = nc2.iebc_code
  );

  -- ── MCA / Ward Representative (1,447 wards) ─────────────────
  -- One MCA per ward — Kenya County Assembly Ward Representatives
  -- Joins wards → constituencies → counties to get all iebc codes needed
  INSERT INTO candidate_election_positions (
    election_id, position_code, position_name, geographic_level,
    county_code, constituency_code, ward_code,
    iebc_form_number, is_running_mate_required, seats_available, sort_order,
    description, created_at, updated_at
  )
  SELECT
    v_election_id,
    'MCA',
    'Member of County Assembly - ' || nw.name,
    'WARD',
    nc3.iebc_code,   -- county iebc_code (3-digit)
    nco.iebc_code,   -- constituency iebc_code (3-digit)
    nw.iebc_code,    -- ward iebc_code (4-digit)
    'Form 35A', FALSE, 1, 50,
    'Member of County Assembly (Ward Representative) for ' || nw.name || ' Ward',
    NOW(), NOW()
  FROM nec_wards nw
  JOIN nec_constituencies nco ON nco.id = nw.constituency_id
  JOIN nec_counties nc3       ON nc3.id = nco.county_id
  WHERE nw.is_special = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM candidate_election_positions
      WHERE election_id = v_election_id
        AND position_code = 'MCA'
        AND ward_code = nw.iebc_code
    );

  -- ── Major Political Parties ─────────────────────────────────
  -- Kenya's main parties as of 2027 election cycle
  INSERT INTO candidate_political_parties (
    id, party_code, name, abbreviation, party_color,
    registration_number, is_active, country_code, created_at, updated_at
  ) VALUES
    ('b1000001-0000-0000-0000-000000000001', 'UDA',     'United Democratic Alliance',          'UDA',     '#FF6600', 'IEBC/PPS/REG/1001', TRUE, 'KEN', NOW(), NOW()),
    ('b1000002-0000-0000-0000-000000000002', 'ODM',     'Orange Democratic Movement',          'ODM',     '#FF8C00', 'IEBC/PPS/REG/1002', TRUE, 'KEN', NOW(), NOW()),
    ('b1000003-0000-0000-0000-000000000003', 'JUBILEE', 'Jubilee Party',                       'JP',      '#CC0000', 'IEBC/PPS/REG/1003', TRUE, 'KEN', NOW(), NOW()),
    ('b1000004-0000-0000-0000-000000000004', 'WIPER',   'Wiper Democratic Movement Kenya',     'Wiper',   '#008000', 'IEBC/PPS/REG/1004', TRUE, 'KEN', NOW(), NOW()),
    ('b1000005-0000-0000-0000-000000000005', 'ANC',     'Amani National Congress',             'ANC',     '#0000CC', 'IEBC/PPS/REG/1005', TRUE, 'KEN', NOW(), NOW()),
    ('b1000006-0000-0000-0000-000000000006', 'FORD-K',  'Forum for the Restoration of Democracy - Kenya', 'FORD-K', '#800080', 'IEBC/PPS/REG/1006', TRUE, 'KEN', NOW(), NOW()),
    ('b1000007-0000-0000-0000-000000000007', 'NARC-K',  'National Alliance Rainbow Coalition Kenya', 'NARC-K', '#006400', 'IEBC/PPS/REG/1007', TRUE, 'KEN', NOW(), NOW()),
    ('b1000008-0000-0000-0000-000000000008', 'SAFINA',  'Safina Party',                        'SAFINA',  '#004080', 'IEBC/PPS/REG/1008', TRUE, 'KEN', NOW(), NOW()),
    ('b1000009-0000-0000-0000-000000000009', 'KANU',    'Kenya African National Union',        'KANU',    '#CC0000', 'IEBC/PPS/REG/1009', TRUE, 'KEN', NOW(), NOW()),
    ('b1000010-0000-0000-0000-000000000010', 'INDEPENDENT', 'Independent Candidate',          'IND',     '#808080', NULL,                TRUE, 'KEN', NOW(), NOW())
  ON CONFLICT (party_code) DO NOTHING;

  RAISE NOTICE 'Kenya 2027 seed complete. Election ID: %', v_election_id;
  RAISE NOTICE '  -     1 PRESIDENT position (national)';
  RAISE NOTICE '  -    47 GOVERNOR positions (counties)';
  RAISE NOTICE '  -    47 SENATOR positions (counties)';
  RAISE NOTICE '  -    47 WOMEN_REP positions (counties)';
  RAISE NOTICE '  -   292 MP positions (constituencies)';
  RAISE NOTICE '  - 1,447 MCA positions (wards)';
  RAISE NOTICE '  - 1,881 total elective positions';
  RAISE NOTICE '  -    10 political parties';

END $$;

-- ── Record migration ─────────────────────────────────────────
INSERT INTO schema_migrations (version, executed_at)
VALUES ('021', NOW())
ON CONFLICT (version) DO NOTHING;
