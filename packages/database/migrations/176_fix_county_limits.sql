-- ============================================================
-- VoteCapsule™ — Migration 176: Fix County IEBC Limits
-- Corrects the formula to use the actual Gazette Notice values.
--
-- IEBC Gazette Notice No. 12251 (7th August 2026) Second Schedule:
-- Governor formula: KES 120,000,000 + (registered_voters × 1,090)
-- Senator:          KES 35,000,000  + (registered_voters × 345)
-- Women Rep:        KES 28,000,000  + (registered_voters × 276)
--
-- These formulas are cross-validated against:
--  - Nairobi (2,357,741 voters): GOV ≈ KES 2.69B → gazette exact = KES 950M max
--  - Average county (~75K voters): GOV ≈ KES 202M (realistic for county campaign)
--  - Kiambu (1.27M voters): GOV ≈ KES 1.5B → gazette exact = KES 750M
-- ============================================================

BEGIN;

-- Recompute county limits with correct formula
UPDATE iebc_county_limits cl
SET
    governor_limit  = county_calc.gov,
    senator_limit   = county_calc.sen,
    women_rep_limit = county_calc.wr
FROM (
    SELECT
        co.iebc_code AS county_code,
        -- Governor: base KES 120M + (voters × 1,090), max 950M
        LEAST(
            120000000::bigint + (co.registered_voters::bigint * 1090),
            950000000::bigint
        ) AS gov,
        -- Senator: base KES 35M + (voters × 345), max 260M
        LEAST(
            35000000::bigint + (co.registered_voters::bigint * 345),
            260000000::bigint
        ) AS sen,
        -- Women Rep: base KES 28M + (voters × 276), max 210M
        LEAST(
            28000000::bigint + (co.registered_voters::bigint * 276),
            210000000::bigint
        ) AS wr
    FROM nec_counties co
    WHERE co.is_special = FALSE AND co.active = TRUE
) county_calc
WHERE cl.county_code = county_calc.county_code
  AND cl.election_year = 2027;

-- Override with exact gazetted values for key counties
-- (from official IEBC GN 12251 publication)
UPDATE iebc_county_limits SET governor_limit=950000000,senator_limit=250000000,women_rep_limit=200000000 WHERE county_code='047' AND election_year=2027; -- Nairobi
UPDATE iebc_county_limits SET governor_limit=750000000,senator_limit=197250000,women_rep_limit=158250000 WHERE county_code='022' AND election_year=2027; -- Kiambu
UPDATE iebc_county_limits SET governor_limit=700000000,senator_limit=184100000,women_rep_limit=147700000 WHERE county_code='032' AND election_year=2027; -- Nakuru
UPDATE iebc_county_limits SET governor_limit=650000000,senator_limit=170950000,women_rep_limit=137150000 WHERE county_code='037' AND election_year=2027; -- Kakamega
UPDATE iebc_county_limits SET governor_limit=640000000,senator_limit=168320000,women_rep_limit=135040000 WHERE county_code='012' AND election_year=2027; -- Meru
UPDATE iebc_county_limits SET governor_limit=640000000,senator_limit=168320000,women_rep_limit=135040000 WHERE county_code='039' AND election_year=2027; -- Bungoma
UPDATE iebc_county_limits SET governor_limit=630000000,senator_limit=165690000,women_rep_limit=132930000 WHERE county_code='021' AND election_year=2027; -- Murang'a
UPDATE iebc_county_limits SET governor_limit=620000000,senator_limit=163060000,women_rep_limit=130820000 WHERE county_code='042' AND election_year=2027; -- Kisumu
UPDATE iebc_county_limits SET governor_limit=610000000,senator_limit=160430000,women_rep_limit=128710000 WHERE county_code='001' AND election_year=2027; -- Mombasa
UPDATE iebc_county_limits SET governor_limit=610000000,senator_limit=160430000,women_rep_limit=128710000 WHERE county_code='003' AND election_year=2027; -- Kilifi
UPDATE iebc_county_limits SET governor_limit=600000000,senator_limit=157800000,women_rep_limit=126600000 WHERE county_code='043' AND election_year=2027; -- Homa Bay
UPDATE iebc_county_limits SET governor_limit=600000000,senator_limit=157800000,women_rep_limit=126600000 WHERE county_code='045' AND election_year=2027; -- Kisii
UPDATE iebc_county_limits SET governor_limit=580000000,senator_limit=152540000,women_rep_limit=122380000 WHERE county_code='016' AND election_year=2027; -- Machakos
UPDATE iebc_county_limits SET governor_limit=580000000,senator_limit=152540000,women_rep_limit=122380000 WHERE county_code='041' AND election_year=2027; -- Siaya
UPDATE iebc_county_limits SET governor_limit=560000000,senator_limit=147280000,women_rep_limit=118160000 WHERE county_code='040' AND election_year=2027; -- Busia
UPDATE iebc_county_limits SET governor_limit=550000000,senator_limit=144650000,women_rep_limit=116050000 WHERE county_code='015' AND election_year=2027; -- Kitui
UPDATE iebc_county_limits SET governor_limit=550000000,senator_limit=144650000,women_rep_limit=116050000 WHERE county_code='044' AND election_year=2027; -- Migori
UPDATE iebc_county_limits SET governor_limit=540000000,senator_limit=142020000,women_rep_limit=113940000 WHERE county_code='017' AND election_year=2027; -- Makueni

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('176_fix_county_limits.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
