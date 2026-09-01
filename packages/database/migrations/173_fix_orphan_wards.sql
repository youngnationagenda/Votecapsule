-- ============================================================
-- VoteCapsule™ — Migration 173: Fix Orphan Wards (Nairobi)
-- Restores voter counts for 3 Nairobi wards whose polling
-- station ward_id links were missing, then re-syncs upward.
-- Ward 1412 DANDORA AREA I     → 20,543 voters
-- Ward 1416 KAYOLE NORTH       → 25,563 voters
-- Ward 1426 UMOJA I            → 40,554 voters
-- ============================================================

BEGIN;

-- Step 1: Restore ward voter counts from original IEBC NEC seed

UPDATE nec_wards
SET registered_voters = 20543, updated_at = NOW()
WHERE iebc_code = '1412'
  AND name ILIKE '%DANDORA%I%';

UPDATE nec_wards
SET registered_voters = 25563, updated_at = NOW()
WHERE iebc_code = '1416'
  AND name ILIKE '%KAYOLE%NORTH%';

UPDATE nec_wards
SET registered_voters = 40554, updated_at = NOW()
WHERE iebc_code = '1426'
  AND name ILIKE '%UMOJA%I%'
  AND name NOT ILIKE '%II%';

-- Step 2: Re-sync constituencies 283, 284, 286 from their wards

UPDATE nec_constituencies con
SET registered_voters = ward_agg.total, updated_at = NOW()
FROM (
    SELECT nw.constituency_id, COALESCE(SUM(nw.registered_voters), 0) AS total
    FROM nec_wards nw
    WHERE nw.is_special = FALSE AND nw.active = TRUE
    GROUP BY nw.constituency_id
) ward_agg
WHERE con.id = ward_agg.constituency_id
  AND con.iebc_code IN ('283', '284', '286');

-- Step 3: Re-sync Nairobi county from all its constituencies

UPDATE nec_counties co
SET registered_voters = const_agg.total, updated_at = NOW()
FROM (
    SELECT nc.county_id, COALESCE(SUM(nc.registered_voters), 0) AS total
    FROM nec_constituencies nc
    WHERE nc.is_special = FALSE AND nc.active = TRUE
    GROUP BY nc.county_id
) const_agg
WHERE co.id = const_agg.county_id
  AND co.iebc_code = '047';

-- Step 4: Re-sync ward_count for the 3 affected constituencies

UPDATE nec_constituencies con
SET ward_count = (
    SELECT COUNT(*)
    FROM nec_wards nw
    WHERE nw.constituency_id = con.id
      AND nw.is_special = FALSE
      AND nw.active = TRUE
)
WHERE con.iebc_code IN ('283', '284', '286');

-- Step 5: Refresh summary views

CREATE OR REPLACE VIEW geography_county_summary AS
SELECT
    co.id,
    co.iebc_code          AS county_code,
    co.name               AS county_name,
    co.registered_voters,
    co.constituency_count,
    co.ward_count,
    co.polling_station_count
FROM nec_counties co
WHERE co.is_special = FALSE AND co.active = TRUE
ORDER BY co.iebc_code;

CREATE OR REPLACE VIEW geography_constituency_summary AS
SELECT
    c.id,
    c.iebc_code           AS constituency_code,
    c.name                AS constituency_name,
    co.iebc_code          AS county_code,
    co.name               AS county_name,
    c.registered_voters,
    c.ward_count,
    c.polling_station_count
FROM nec_constituencies c
JOIN nec_counties co ON co.id = c.county_id
WHERE c.is_special = FALSE AND c.active = TRUE
ORDER BY c.iebc_code;

CREATE OR REPLACE VIEW geography_ward_summary AS
SELECT
    w.id,
    w.iebc_code           AS ward_code,
    w.name                AS ward_name,
    c.iebc_code           AS constituency_code,
    c.name                AS constituency_name,
    co.iebc_code          AS county_code,
    co.name               AS county_name,
    w.registered_voters,
    w.polling_station_count,
    w.registration_centre_count
FROM nec_wards w
JOIN nec_constituencies c  ON c.id  = w.constituency_id
JOIN nec_counties       co ON co.id = c.county_id
WHERE w.is_special = FALSE AND w.active = TRUE
ORDER BY w.iebc_code;

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('173_fix_orphan_wards.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
