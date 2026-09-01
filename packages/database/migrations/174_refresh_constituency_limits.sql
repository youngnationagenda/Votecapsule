-- ============================================================
-- VoteCapsule™ — Migration 174: Refresh IEBC Constituency Limits
-- Re-computes spending limits after migration 172+173 fixed
-- registered_voters to be correctly synced from polling stations.
--
-- Formula: KES 10,795,432 + (registered_voters × 53.72) + (350 km² × 2,112)
-- Source: IEBC Gazette Notice No. 12251, 7th August 2026 — Third Schedule
-- ============================================================

BEGIN;

-- Re-compute spending limits using corrected voter counts from migration 172+173
UPDATE iebc_constituency_limits lim
SET
    population         = nc.registered_voters,
    spending_limit_kes = GREATEST(
        10795432
        + ROUND(nc.registered_voters * 53.72)
        + ROUND(350.0 * 2112.0),
        15000000
    )::bigint,
    gazette_ref        = 'GN 12251 (2026)',
    schedule           = 'Third Schedule'
FROM nec_constituencies nc
JOIN nec_counties co ON co.id = nc.county_id
WHERE lim.constituency_code = nc.iebc_code::integer
  AND lim.election_year = 2027
  AND nc.is_special = FALSE;

-- Re-apply urban constituency floors
UPDATE iebc_constituency_limits
SET spending_limit_kes = 35000000
WHERE county_code = '047'
  AND election_year = 2027
  AND spending_limit_kes < 35000000;

UPDATE iebc_constituency_limits
SET spending_limit_kes = 28000000
WHERE county_code = '001'
  AND election_year = 2027
  AND spending_limit_kes < 28000000;

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('174_refresh_constituency_limits.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
