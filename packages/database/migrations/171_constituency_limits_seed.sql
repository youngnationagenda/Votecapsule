-- ============================================================
-- VoteCapsule™ — Migration 171: IEBC Constituency Spending Limits
-- Seeds all 290 constituencies using the Third Schedule formula:
--   KES 10,795,432 + (registered_voters × 53.72) + (area_sq_km × 2,112)
-- Source: IEBC Gazette Notice No. 12251, 7th August 2026
-- Depends on: Migration 169 (iebc_constituency_limits table)
-- NEC table schema:
--   nec_constituencies: id, county_id, iebc_code, name, registered_voters
--   nec_counties:       id, iebc_code, name, registered_voters
-- ============================================================

BEGIN;

-- ── Seed from NEC data (formula-computed) ────────────────────
-- nec_constituencies.registered_voters is the IEBC-registered voter count.
-- area_sq_km defaults to 350 km² (Kenya average constituency) as NEC
-- data doesn't include area in the current schema.

INSERT INTO iebc_constituency_limits (
    constituency_code,
    constituency_name,
    county_code,
    election_year,
    population,
    area_sq_km,
    spending_limit_kes,
    is_computed,
    gazette_ref,
    schedule
)
SELECT
    nc.iebc_code::integer                                         AS constituency_code,
    nc.name                                                       AS constituency_name,
    co.iebc_code                                                  AS county_code,
    2027                                                          AS election_year,
    COALESCE(nc.registered_voters, 0)                             AS population,
    350.0                                                         AS area_sq_km,
    -- Third Schedule formula (Gazette Notice GN 12251):
    -- KES 10,795,432 + (registered_voters × 53.72) + (area_km² × 2,112)
    GREATEST(
        10795432
        + ROUND(COALESCE(nc.registered_voters, 0) * 53.72)
        + ROUND(350.0 * 2112.0),
        15000000   -- floor: no constituency limit below KES 15M
    )::bigint                                                     AS spending_limit_kes,
    TRUE                                                          AS is_computed,
    'GN 12251 (2026)'                                             AS gazette_ref,
    'Third Schedule'                                              AS schedule
FROM nec_constituencies nc
JOIN nec_counties co ON co.id = nc.county_id
WHERE nc.is_special = FALSE
  AND nc.active = TRUE
  AND nc.iebc_code ~ '^\d+$'   -- only numeric codes
ON CONFLICT (constituency_code, election_year)
DO UPDATE SET
    constituency_name   = EXCLUDED.constituency_name,
    county_code         = EXCLUDED.county_code,
    population          = EXCLUDED.population,
    area_sq_km          = EXCLUDED.area_sq_km,
    spending_limit_kes  = EXCLUDED.spending_limit_kes,
    is_computed         = TRUE;

-- ── Urban constituency floors ─────────────────────────────────
-- Nairobi (county 047) — KES 35M floor (high urban density)
UPDATE iebc_constituency_limits
SET spending_limit_kes = 35000000
WHERE county_code = '047'
  AND election_year = 2027
  AND spending_limit_kes < 35000000;

-- Mombasa (county 001) — KES 28M floor
UPDATE iebc_constituency_limits
SET spending_limit_kes = 28000000
WHERE county_code = '001'
  AND election_year = 2027
  AND spending_limit_kes < 28000000;

-- ── Verification log ─────────────────────────────────────────
DO $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM iebc_constituency_limits
    WHERE election_year = 2027;
    RAISE NOTICE 'iebc_constituency_limits: % rows seeded for 2027', v_count;
END $$;

-- ── Record migration ─────────────────────────────────────────
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('171_constituency_limits_seed.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
