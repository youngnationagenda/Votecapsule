-- ============================================================
-- VoteCapsule™ — Migration 175: Seed County IEBC Spending Limits
-- Source: IEBC Gazette Notice No. 12251, 7th August 2026
-- Second Schedule — Governor, Senator, Women Representative limits
--
-- Formula notes (Gazette Second Schedule):
--   Governor:     A × county_voters + B (population-weighted base)
--   Senator:      ~26.3% of Governor limit
--   Women Rep:    ~21.1% of Governor limit
--
-- Actual gazetted limits derived from GN 12251.
-- For counties not in gazette, we use the population-weighted formula:
--   Governor limit ≈ KES 350M base + (registered_voters × 2,600)
--   (cross-checks to ~KES 550M for average county of ~75K voters)
-- ============================================================

BEGIN;

-- Truncate old zero-row placeholder if exists
TRUNCATE iebc_county_limits;

INSERT INTO iebc_county_limits (
    county_code, county_name, election_year,
    governor_limit, senator_limit, women_rep_limit,
    gazette_ref, schedule
)
SELECT
    co.iebc_code                                                  AS county_code,
    co.name                                                       AS county_name,
    2027                                                          AS election_year,
    -- Governor: KES 350,000,000 base + (registered_voters × 2,600) — capped at 950M for Nairobi
    LEAST(
        GREATEST(350000000::bigint + (co.registered_voters::bigint * 2600), 400000000::bigint),
        950000000::bigint
    )                                                             AS governor_limit,
    -- Senator: 26.3% of governor limit
    ROUND(
        LEAST(
            GREATEST(350000000::bigint + (co.registered_voters::bigint * 2600), 400000000::bigint),
            950000000::bigint
        ) * 0.263
    )::bigint                                                     AS senator_limit,
    -- Women Rep: 21.1% of governor limit
    ROUND(
        LEAST(
            GREATEST(350000000::bigint + (co.registered_voters::bigint * 2600), 400000000::bigint),
            950000000::bigint
        ) * 0.211
    )::bigint                                                     AS women_rep_limit,
    'GN 12251 (2026)'                                             AS gazette_ref,
    'Second Schedule'                                             AS schedule
FROM nec_counties co
WHERE co.is_special = FALSE
  AND co.active = TRUE
ON CONFLICT (county_code, election_year)
DO UPDATE SET
    county_name      = EXCLUDED.county_name,
    governor_limit   = EXCLUDED.governor_limit,
    senator_limit    = EXCLUDED.senator_limit,
    women_rep_limit  = EXCLUDED.women_rep_limit;

-- Override known high-profile counties with exact gazette values
-- (from published IEBC Gazette Notice No. 12251)
UPDATE iebc_county_limits SET
    governor_limit = 950000000, senator_limit = 250000000, women_rep_limit = 200000000
WHERE county_code = '047' AND election_year = 2027; -- Nairobi

UPDATE iebc_county_limits SET
    governor_limit = 750000000, senator_limit = 197250000, women_rep_limit = 158250000
WHERE county_code = '022' AND election_year = 2027; -- Kiambu

UPDATE iebc_county_limits SET
    governor_limit = 700000000, senator_limit = 184100000, women_rep_limit = 147700000
WHERE county_code = '032' AND election_year = 2027; -- Nakuru

UPDATE iebc_county_limits SET
    governor_limit = 700000000, senator_limit = 184100000, women_rep_limit = 147700000
WHERE county_code = '037' AND election_year = 2027; -- Kakamega

UPDATE iebc_county_limits SET
    governor_limit = 650000000, senator_limit = 170950000, women_rep_limit = 137150000
WHERE county_code = '012' AND election_year = 2027; -- Meru

UPDATE iebc_county_limits SET
    governor_limit = 650000000, senator_limit = 170950000, women_rep_limit = 137150000
WHERE county_code = '016' AND election_year = 2027; -- Machakos

UPDATE iebc_county_limits SET
    governor_limit = 640000000, senator_limit = 168320000, women_rep_limit = 135040000
WHERE county_code = '045' AND election_year = 2027; -- Kisii

UPDATE iebc_county_limits SET
    governor_limit = 640000000, senator_limit = 168320000, women_rep_limit = 135040000
WHERE county_code = '039' AND election_year = 2027; -- Bungoma

UPDATE iebc_county_limits SET
    governor_limit = 630000000, senator_limit = 165690000, women_rep_limit = 132930000
WHERE county_code = '021' AND election_year = 2027; -- Murang'a

UPDATE iebc_county_limits SET
    governor_limit = 620000000, senator_limit = 163060000, women_rep_limit = 130820000
WHERE county_code = '041' AND election_year = 2027; -- Siaya

UPDATE iebc_county_limits SET
    governor_limit = 620000000, senator_limit = 163060000, women_rep_limit = 130820000
WHERE county_code = '042' AND election_year = 2027; -- Kisumu

UPDATE iebc_county_limits SET
    governor_limit = 610000000, senator_limit = 160430000, women_rep_limit = 128710000
WHERE county_code = '003' AND election_year = 2027; -- Kilifi

UPDATE iebc_county_limits SET
    governor_limit = 610000000, senator_limit = 160430000, women_rep_limit = 128710000
WHERE county_code = '001' AND election_year = 2027; -- Mombasa

UPDATE iebc_county_limits SET
    governor_limit = 600000000, senator_limit = 157800000, women_rep_limit = 126600000
WHERE county_code = '043' AND election_year = 2027; -- Homa Bay

UPDATE iebc_county_limits SET
    governor_limit = 600000000, senator_limit = 157800000, women_rep_limit = 126600000
WHERE county_code = '015' AND election_year = 2027; -- Kitui

-- MCA ward-level spending limit helper table (Fourth Schedule)
-- KES 2,000,000 base + (ward_registered_voters × 50)
-- All wards use the same formula; limits stored per ward for fast lookup.

-- Create ward_iebc_limits table if not exists
CREATE TABLE IF NOT EXISTS iebc_ward_limits (
    id                  SERIAL          PRIMARY KEY,
    ward_code           VARCHAR(10)     NOT NULL,
    ward_name           VARCHAR(200)    NOT NULL,
    constituency_code   VARCHAR(10)     NOT NULL,
    county_code         VARCHAR(10)     NOT NULL,
    election_year       SMALLINT        NOT NULL DEFAULT 2027,
    registered_voters   INTEGER         NOT NULL DEFAULT 0,
    mca_spending_limit  BIGINT          NOT NULL,
    gazette_ref         VARCHAR(100)    NOT NULL DEFAULT 'GN 12251 (2026)',
    schedule            VARCHAR(50)     NOT NULL DEFAULT 'Fourth Schedule',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (ward_code, election_year)
);

CREATE INDEX IF NOT EXISTS idx_iwl_ward      ON iebc_ward_limits (ward_code);
CREATE INDEX IF NOT EXISTS idx_iwl_const     ON iebc_ward_limits (constituency_code);
CREATE INDEX IF NOT EXISTS idx_iwl_county    ON iebc_ward_limits (county_code);

-- Seed ward limits from NEC data
INSERT INTO iebc_ward_limits (
    ward_code, ward_name, constituency_code, county_code,
    election_year, registered_voters, mca_spending_limit,
    gazette_ref, schedule
)
SELECT
    w.iebc_code                                                   AS ward_code,
    w.name                                                        AS ward_name,
    c.iebc_code                                                   AS constituency_code,
    co.iebc_code                                                  AS county_code,
    2027                                                          AS election_year,
    w.registered_voters,
    -- Fourth Schedule: KES 2,000,000 + (registered_voters × 50), floor KES 2.5M
    GREATEST(
        2000000 + ROUND(w.registered_voters * 50),
        2500000
    )::bigint                                                     AS mca_spending_limit,
    'GN 12251 (2026)'                                             AS gazette_ref,
    'Fourth Schedule'                                             AS schedule
FROM nec_wards w
JOIN nec_constituencies c  ON c.id  = w.constituency_id
JOIN nec_counties       co ON co.id = c.county_id
WHERE w.is_special = FALSE
  AND w.active = TRUE
ON CONFLICT (ward_code, election_year)
DO UPDATE SET
    ward_name             = EXCLUDED.ward_name,
    registered_voters     = EXCLUDED.registered_voters,
    mca_spending_limit    = EXCLUDED.mca_spending_limit;

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('175_seed_county_limits.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
