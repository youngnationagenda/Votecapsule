-- ============================================================
-- VoteCapsule™ — Migration 172: Sync Geography Registered Voters
-- 
-- Ground truth: nec_polling_stations.registered_voters (per-stream)
-- Hierarchy (bottom-up):
--   polling_station → ward → constituency → county
--
-- Step 1: Ward voters    = SUM(ps.registered_voters) WHERE ps.ward_id = ward.id
-- Step 2: Constituency   = SUM(ward.registered_voters) WHERE ward.constituency_id = const.id
-- Step 3: County         = SUM(const.registered_voters) WHERE const.county_id = county.id
--
-- Also adds computed helper columns:
--   ward_count, constituency_count, polling_station_count (per geography level)
--
-- "this should come from total wards, and vice versa" means every level
-- is bidirectionally consistent with the wards/polling-station ground truth.
-- ============================================================

BEGIN;

-- ── STEP 1: Sync ward registered_voters from polling stations ─
-- Each ward's voter count = SUM of all polling station voters in that ward
-- (polling stations link via ward_id FK — fully populated 45805/45805)

UPDATE nec_wards w
SET
    registered_voters = agg.ps_voters,
    updated_at        = NOW()
FROM (
    SELECT
        ps.ward_id,
        COALESCE(SUM(ps.registered_voters), 0) AS ps_voters
    FROM nec_polling_stations ps
    WHERE ps.ward_id IS NOT NULL
      AND ps.is_special = FALSE
      AND ps.active = TRUE
    GROUP BY ps.ward_id
) agg
WHERE w.id = agg.ward_id
  AND w.is_special = FALSE;

-- ── STEP 2: Sync constituency registered_voters from wards ────
-- Each constituency's voter count = SUM of all ward voters in that constituency

UPDATE nec_constituencies c
SET
    registered_voters = agg.ward_voters,
    updated_at        = NOW()
FROM (
    SELECT
        w.constituency_id,
        COALESCE(SUM(w.registered_voters), 0) AS ward_voters
    FROM nec_wards w
    WHERE w.is_special = FALSE
      AND w.active = TRUE
    GROUP BY w.constituency_id
) agg
WHERE c.id = agg.constituency_id
  AND c.is_special = FALSE;

-- ── STEP 3: Sync county registered_voters from constituencies ─
-- Each county's voter count = SUM of all constituency voters in that county

UPDATE nec_counties co
SET
    registered_voters = agg.const_voters,
    updated_at        = NOW()
FROM (
    SELECT
        c.county_id,
        COALESCE(SUM(c.registered_voters), 0) AS const_voters
    FROM nec_constituencies c
    WHERE c.is_special = FALSE
      AND c.active = TRUE
    GROUP BY c.county_id
) agg
WHERE co.id = agg.county_id
  AND co.is_special = FALSE;

-- ── STEP 4: Add ward_count + constituency_count columns to counties ──
-- These are computed counts of child units, useful for budgeting

ALTER TABLE nec_counties
    ADD COLUMN IF NOT EXISTS ward_count           INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS constituency_count   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS polling_station_count INTEGER NOT NULL DEFAULT 0;

UPDATE nec_counties co
SET
    constituency_count    = const_agg.c_count,
    ward_count            = ward_agg.w_count,
    polling_station_count = ps_agg.ps_count
FROM (
    SELECT county_id, COUNT(*) AS c_count
    FROM nec_constituencies
    WHERE is_special = FALSE AND active = TRUE
    GROUP BY county_id
) const_agg,
(
    SELECT co2.id AS county_id, COUNT(w.id) AS w_count
    FROM nec_counties co2
    JOIN nec_constituencies c2 ON c2.county_id = co2.id AND c2.is_special = FALSE AND c2.active = TRUE
    JOIN nec_wards w ON w.constituency_id = c2.id AND w.is_special = FALSE AND w.active = TRUE
    GROUP BY co2.id
) ward_agg,
(
    SELECT county_id, COUNT(*) AS ps_count
    FROM nec_polling_stations
    WHERE is_special = FALSE AND active = TRUE
    GROUP BY county_id
) ps_agg
WHERE co.id = const_agg.county_id
  AND co.id = ward_agg.county_id
  AND co.id = ps_agg.county_id;

-- ── STEP 5: Add ward_count + polling_station_count to constituencies ──

ALTER TABLE nec_constituencies
    ADD COLUMN IF NOT EXISTS ward_count           INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS polling_station_count INTEGER NOT NULL DEFAULT 0;

UPDATE nec_constituencies c
SET
    ward_count            = ward_agg.w_count,
    polling_station_count = ps_agg.ps_count
FROM (
    SELECT constituency_id, COUNT(*) AS w_count
    FROM nec_wards
    WHERE is_special = FALSE AND active = TRUE
    GROUP BY constituency_id
) ward_agg,
(
    SELECT constituency_id, COUNT(*) AS ps_count
    FROM nec_polling_stations
    WHERE is_special = FALSE AND active = TRUE
    GROUP BY constituency_id
) ps_agg
WHERE c.id = ward_agg.constituency_id
  AND c.id = ps_agg.constituency_id
  AND c.is_special = FALSE;

-- ── STEP 6: Add polling_station_count + registration_centre_count to wards ──

ALTER TABLE nec_wards
    ADD COLUMN IF NOT EXISTS polling_station_count      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS registration_centre_count  INTEGER NOT NULL DEFAULT 0;

UPDATE nec_wards w
SET
    polling_station_count     = ps_agg.ps_count,
    registration_centre_count = rc_agg.rc_count
FROM (
    SELECT ward_id, COUNT(*) AS ps_count
    FROM nec_polling_stations
    WHERE is_special = FALSE AND active = TRUE
    GROUP BY ward_id
) ps_agg,
(
    SELECT ward_id, COUNT(*) AS rc_count
    FROM nec_registration_centres
    WHERE is_special = FALSE AND active = TRUE
    GROUP BY ward_id
) rc_agg
WHERE w.id = ps_agg.ward_id
  AND w.id = rc_agg.ward_id
  AND w.is_special = FALSE;

-- ── STEP 7: Verification ─────────────────────────────────────
DO $$
DECLARE
  v_county_total     BIGINT;
  v_const_total      BIGINT;
  v_ward_total       BIGINT;
  v_ps_total         BIGINT;
  v_diff_c_vs_const  BIGINT;
  v_diff_co_vs_w     BIGINT;
BEGIN
  SELECT SUM(registered_voters) INTO v_county_total
  FROM nec_counties WHERE is_special = FALSE;

  SELECT SUM(registered_voters) INTO v_const_total
  FROM nec_constituencies WHERE is_special = FALSE;

  SELECT SUM(registered_voters) INTO v_ward_total
  FROM nec_wards WHERE is_special = FALSE;

  SELECT SUM(registered_voters) INTO v_ps_total
  FROM nec_polling_stations WHERE is_special = FALSE AND active = TRUE;

  v_diff_c_vs_const := ABS(v_county_total - v_const_total);
  v_diff_co_vs_w    := ABS(v_county_total - v_ward_total);

  RAISE NOTICE '=== Geography Sync Verification ===';
  RAISE NOTICE 'Polling station sum : %', v_ps_total;
  RAISE NOTICE 'Ward total          : %', v_ward_total;
  RAISE NOTICE 'Constituency total  : %', v_const_total;
  RAISE NOTICE 'County total        : %', v_county_total;
  RAISE NOTICE 'County vs Constituency diff: % (should be 0)', v_diff_c_vs_const;
  RAISE NOTICE 'County vs Ward diff        : % (should be 0)', v_diff_co_vs_w;
END $$;

-- ── STEP 8: Create a geography summary view ───────────────────
-- Used by budget service getCampaignGeography() and API responses

CREATE OR REPLACE VIEW geography_county_summary AS
SELECT
    co.id,
    co.iebc_code                                        AS county_code,
    co.name                                             AS county_name,
    co.registered_voters,
    co.constituency_count,
    co.ward_count,
    co.polling_station_count
FROM nec_counties co
WHERE co.is_special = FALSE
  AND co.active = TRUE
ORDER BY co.iebc_code;

CREATE OR REPLACE VIEW geography_constituency_summary AS
SELECT
    c.id,
    c.iebc_code                                         AS constituency_code,
    c.name                                              AS constituency_name,
    co.iebc_code                                        AS county_code,
    co.name                                             AS county_name,
    c.registered_voters,
    c.ward_count,
    c.polling_station_count
FROM nec_constituencies c
JOIN nec_counties co ON co.id = c.county_id
WHERE c.is_special = FALSE
  AND c.active = TRUE
ORDER BY c.iebc_code;

CREATE OR REPLACE VIEW geography_ward_summary AS
SELECT
    w.id,
    w.iebc_code                                         AS ward_code,
    w.name                                              AS ward_name,
    c.iebc_code                                         AS constituency_code,
    c.name                                              AS constituency_name,
    co.iebc_code                                        AS county_code,
    co.name                                             AS county_name,
    w.registered_voters,
    w.polling_station_count,
    w.registration_centre_count
FROM nec_wards w
JOIN nec_constituencies c  ON c.id  = w.constituency_id
JOIN nec_counties       co ON co.id = c.county_id
WHERE w.is_special = FALSE
  AND w.active = TRUE
ORDER BY w.iebc_code;

-- ── STEP 9: Record migration ──────────────────────────────────
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('172_sync_geography_voters.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
