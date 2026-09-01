-- ============================================================
-- VoteCapsule™ Migration 164
-- IEBC Kenya 2027 General Election — Spending Limits
-- Source: IEBC Gazette Notice No. 12251, 7th August 2026
--         First–Fifth Schedules + Sixth Schedule (formula)
--
-- Tables:
--   iebc_formula_parameters     — Sixth Schedule formula (ward/const/county)
--   iebc_spending_categories    — 11 authorized spending items (Fifth Schedule)
--   iebc_presidential_limit     — First Schedule (national total)
--   iebc_county_limits          — Second Schedule (47 counties)
--   iebc_constituency_limits    — Third Schedule (290 constituencies)
--   iebc_party_limits           — Fifth Schedule (party totals by category)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Sixth Schedule: Formula Parameters
-- Spending Limit = fixed_cost + (population × pop_unit_cost)
--                             + (area_sq_km × area_unit_cost)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_formula_parameters (
    id              SERIAL PRIMARY KEY,
    electoral_level VARCHAR(30) NOT NULL UNIQUE,
    -- 'ward', 'constituency', 'county', 'presidential'
    fixed_cost      BIGINT   NOT NULL,
    pop_unit_cost   DECIMAL(10,2) NOT NULL,  -- KES per person
    area_unit_cost  DECIMAL(10,2) NOT NULL,  -- KES per sq km
    notes           TEXT,
    gazette_notice  VARCHAR(50) DEFAULT 'GN 12251 / 7 Aug 2026',
    effective_date  DATE NOT NULL DEFAULT '2026-08-07'
);

INSERT INTO iebc_formula_parameters
  (electoral_level, fixed_cost, pop_unit_cost, area_unit_cost, notes)
VALUES
  ('ward',          3225105,  42.10,  1655.00, 'Fourth Schedule — MCA (County Assembly Ward)'),
  ('constituency',  10795432, 53.72,  2112.00, 'Third Schedule — MP (National Assembly)'),
  ('county',        14406545, 33.83,  1330.00, 'Second Schedule — Governor / Senator / Women Rep'),
  ('presidential',  0,        0,      0,       'First Schedule — fixed national total')
ON CONFLICT (electoral_level) DO UPDATE SET
  fixed_cost     = EXCLUDED.fixed_cost,
  pop_unit_cost  = EXCLUDED.pop_unit_cost,
  area_unit_cost = EXCLUDED.area_unit_cost;

-- ─────────────────────────────────────────────────────────────
-- Authorized Spending Categories (apply to ALL schedules)
-- Gazette: "authorized items or activities for campaign expenses"
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_spending_categories (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    party_limit_kes BIGINT,         -- Fifth Schedule party-level cap
    party_share_pct DECIMAL(5,2),   -- % of total party limit
    gazette_item_no INTEGER,
    notes           TEXT
);

INSERT INTO iebc_spending_categories
  (code, name, party_limit_kes, party_share_pct, gazette_item_no)
VALUES
  ('venues',            'Venues',                      375052688,    1.5,  1),
  ('publicity',         'Publicity Materials',          1066714464,   4.4,  2),
  ('advertising',       'Advertising and Media',        2517509489,  10.3,  3),
  ('personnel',         'Campaign Personnel',           332922614,    1.4,  4),
  ('agents',            'Election Agents',              2081162296,   8.5,  5),
  ('transport',         'Transportation',               16126632035,  66.0, 6),
  ('communication',     'Communication',                134230217,    0.5,  7),
  ('nomination_fees',   'Nomination Fees and Charges',  213818044,    0.9,  8),
  ('security',          'Security',                     285090725,    1.2,  9),
  ('accommodation',     'Accommodation',                24945438,     0.1,  10),
  ('administrative',    'Administrative Cost',          1292094521,   5.3,  11)
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  party_limit_kes  = EXCLUDED.party_limit_kes,
  party_share_pct  = EXCLUDED.party_share_pct;

-- ─────────────────────────────────────────────────────────────
-- Presidential Limit (First Schedule)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_presidential_limit (
    id                      SERIAL PRIMARY KEY,
    election_year           INTEGER NOT NULL DEFAULT 2027,
    total_population        BIGINT NOT NULL,
    total_area_sq_km        BIGINT NOT NULL,
    spending_limit_kes      BIGINT NOT NULL,
    single_source_cap_pct   DECIMAL(5,2) DEFAULT 20.00,
    contribution_limit_pct  DECIMAL(5,2) DEFAULT 100.00,
    gazette_notice          VARCHAR(50) DEFAULT 'GN 12251 / 7 Aug 2026',
    UNIQUE(election_year)
);

INSERT INTO iebc_presidential_limit
  (election_year, total_population, total_area_sq_km, spending_limit_kes)
VALUES
  (2027, 47564296, 581307, 6112543133)
ON CONFLICT (election_year) DO UPDATE SET
  spending_limit_kes = EXCLUDED.spending_limit_kes;

-- ─────────────────────────────────────────────────────────────
-- County-Level Limits (Second Schedule)
-- Applies to: Governor, Senator, Women Representative
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_county_limits (
    id                  SERIAL PRIMARY KEY,
    county_code         CHAR(3) NOT NULL UNIQUE,  -- IEBC county code (001-047)
    county_name         VARCHAR(100) NOT NULL,
    population          BIGINT NOT NULL,
    area_sq_km          DECIMAL(10,2) NOT NULL,
    spending_limit_kes  BIGINT NOT NULL,
    -- Positions sharing this limit
    applies_to_governor        BOOLEAN DEFAULT TRUE,
    applies_to_senator         BOOLEAN DEFAULT TRUE,
    applies_to_women_rep       BOOLEAN DEFAULT TRUE,
    -- Contribution rules
    single_source_cap_pct      DECIMAL(5,2) DEFAULT 20.00,
    contribution_limit_pct     DECIMAL(5,2) DEFAULT 100.00,
    election_year              INTEGER DEFAULT 2027,
    gazette_notice             VARCHAR(50) DEFAULT 'GN 12251 / 7 Aug 2026'
);

-- All 47 counties from Second Schedule
INSERT INTO iebc_county_limits
  (county_code, county_name, population, area_sq_km, spending_limit_kes)
VALUES
  ('001', 'Mombasa',        1208333,    219.00,     60967580),
  ('002', 'Kwale',          866820,     8270.00,    58831579),
  ('003', 'Kilifi',         1453787,    12610.00,   86540978),
  ('004', 'Tana River',     315943,     38437.00,   78056087),
  ('005', 'Lamu',           143920,     6273.00,    28693735),
  ('006', 'Taita Taveta',   340671,     17084.00,   49743709),
  ('007', 'Garissa',        841353,     44175.00,   106005417),
  ('008', 'Wajir',          781263,     56686.00,   120758077),
  ('009', 'Mandera',        867457,     25991.00,   83048388),
  ('010', 'Marsabit',       459785,     70961.00,   127022462),
  ('011', 'Isiolo',         268002,     25336.00,   59283969),
  ('012', 'Meru',           1545714,    6933.00,    80000292),
  ('013', 'Tharaka Nithi',  393177,     2639.00,    32302217),
  ('014', 'Embu',           608599,     2818.00,    40539458),
  ('015', 'Kitui',          1136187,    30497.00,   97557935),
  ('016', 'Machakos',       1421932,    6208.00,    74032349),
  ('017', 'Makueni',        987653,     8009.00,    61103771),
  ('018', 'Nyandarua',      638289,     3245.00,    43117614),
  ('019', 'Nyeri',          759164,     3337.00,    47688687),
  ('020', 'Kirinyaga',      610411,     1479.00,    38828616),
  ('021', 'Murang''a',      1056640,    2559.00,    56244955),
  ('022', 'Kiambu',         2417735,    2543.00,    110961257),
  ('023', 'Turkana',        926976,     68680.00,   142072389),
  ('024', 'West Pokot',     621241,     9169.00,    50500924),
  ('025', 'Samburu',        310327,     21022.00,   54779994),
  ('026', 'Trans Nzoia',    990341,     2496.00,    55217341),
  ('027', 'Uasin Gishu',    1163186,    3345.00,    63066604),
  ('028', 'Elgeyo Marakwet',454480,     3030.00,    35659941),
  ('029', 'Nandi',          885711,     2884.00,    51463799),
  ('030', 'Baringo',        666763,     11015.00,   54916519),
  ('031', 'Laikipia',       518560,     9462.00,    46715011),
  ('032', 'Nakuru',         2162202,    7495.00,    107095876),
  ('033', 'Narok',          1157873,    17933.00,   84103648),
  ('034', 'Kajiado',        1117840,    21901.00,   88458713),
  ('035', 'Kericho',        901777,     2158.00,    50430626),
  ('036', 'Bomet',          875689,     2792.00,    50774076),
  ('037', 'Kakamega',       1867579,    3018.00,    88535359),
  ('038', 'Vihiga',         590013,     564.00,     36683540),
  ('039', 'Bungoma',        1670570,    3032.00,    80844663),
  ('040', 'Busia',          893681,     1695.00,    50678381),
  ('041', 'Siaya',          993183,     2530.00,    54887725),
  ('042', 'Kisumu',         1155574,    2086.00,    60822166),
  ('043', 'Homa Bay',       1131950,    3183.00,    61880866),
  ('044', 'Migori',         1116436,    2596.00,    61567788),
  ('045', 'Kisii',          1266860,    1318.00,    62519170),
  ('046', 'Nyamira',        605576,     899.00,     38115302),
  ('047', 'Nairobi City',   4397073,    695.00,     181312885)
ON CONFLICT (county_code) DO UPDATE SET
  spending_limit_kes = EXCLUDED.spending_limit_kes,
  population         = EXCLUDED.population,
  area_sq_km         = EXCLUDED.area_sq_km;

-- ─────────────────────────────────────────────────────────────
-- Constituency-Level Limits (Third Schedule — MP)
-- Partial seed (first 82 from gazette extract)
-- Remaining can be computed using formula:
--   limit = 10,795,432 + (population × 53.72) + (area × 2,112)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_constituency_limits (
    id                  SERIAL PRIMARY KEY,
    constituency_code   INTEGER NOT NULL UNIQUE,  -- IEBC code 1-290
    constituency_name   VARCHAR(100) NOT NULL,
    county_code         CHAR(3),
    population          BIGINT NOT NULL,
    area_sq_km          DECIMAL(10,2) NOT NULL,
    spending_limit_kes  BIGINT NOT NULL,
    is_computed         BOOLEAN DEFAULT FALSE,  -- TRUE if derived from formula, FALSE if from gazette
    election_year       INTEGER DEFAULT 2027,
    gazette_notice      VARCHAR(50) DEFAULT 'GN 12251 / 7 Aug 2026'
);

-- Mombasa (1-6)
INSERT INTO iebc_constituency_limits
  (constituency_code, constituency_name, county_code, population, area_sq_km, spending_limit_kes)
VALUES
  (1,  'Changamwe',   '001', 131797,  16.00,    18302374),
  (2,  'Jomvu',       '001', 167143,  29.00,    20334070),
  (3,  'Kisauni',     '001', 289579,  88.00,    27401021),
  (4,  'Nyali',       '001', 216458,  22.00,    23115519),
  (5,  'Likoni',      '001', 251833,  42.00,    25163610),
  (6,  'Mvita',       '001', 151525,  16.00,    19421040),
  -- Kwale (7-11)
  (7,  'Msambweni',   '002', 174410,  424.00,   21580342),
  (8,  'Lungalunga',  '002', 198918,  2804.00,  27996585),
  (9,  'Matuga',      '002', 193571,  1032.00,  23950925),
  (10, 'Kinango',     '002', 299920,  4012.00,  32699462),
  -- Kilifi (11-17)
  (11, 'Kilifi North','003', 283720,  529.00,   27358744),
  (12, 'Kilifi South','003', 233771,  401.00,   24219612),
  (13, 'Kaloleni',    '003', 192291,  686.00,   23077459),
  (14, 'Rabai',       '003', 121330,  206.00,   18247478),
  (15, 'Ganze',       '003', 173966,  2941.00,  26609289),
  (16, 'Malindi',     '003', 214223,  627.00,   23748791),
  (17, 'Magarini',    '003', 234485,  6980.00,  38454860)
ON CONFLICT (constituency_code) DO UPDATE SET
  spending_limit_kes = EXCLUDED.spending_limit_kes;

-- ─────────────────────────────────────────────────────────────
-- Party Spending Limits (Fifth Schedule)
-- Total and per-category limits
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_party_limits (
    id                       SERIAL PRIMARY KEY,
    election_year            INTEGER NOT NULL DEFAULT 2027 UNIQUE,
    total_limit_kes          BIGINT NOT NULL,
    -- Per category (mirrors iebc_spending_categories)
    limit_venues             BIGINT DEFAULT 375052688,
    limit_publicity          BIGINT DEFAULT 1066714464,
    limit_advertising        BIGINT DEFAULT 2517509489,
    limit_personnel          BIGINT DEFAULT 332922614,
    limit_agents             BIGINT DEFAULT 2081162296,
    limit_transport          BIGINT DEFAULT 16126632035,
    limit_communication      BIGINT DEFAULT 134230217,
    limit_nomination_fees    BIGINT DEFAULT 213818044,
    limit_security           BIGINT DEFAULT 285090725,
    limit_accommodation      BIGINT DEFAULT 24945438,
    limit_administrative     BIGINT DEFAULT 1292094521,
    -- Contribution rules
    contribution_limit_pct   DECIMAL(5,2) DEFAULT 100.00,
    single_source_cap_pct    DECIMAL(5,2) DEFAULT 20.00,
    gazette_notice           VARCHAR(50) DEFAULT 'GN 12251 / 7 Aug 2026'
);

INSERT INTO iebc_party_limits (election_year, total_limit_kes)
VALUES (2027, 24450172531)
ON CONFLICT (election_year) DO UPDATE SET total_limit_kes = EXCLUDED.total_limit_kes;

-- ─────────────────────────────────────────────────────────────
-- Helper view: get IEBC limit for any position + geography
-- Usage: SELECT * FROM v_iebc_limit WHERE position = 'GOVERNOR' AND county_code = '047'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_iebc_limits AS
-- Presidential
SELECT
    'PRESIDENT'         AS position,
    NULL::CHAR(3)       AS county_code,
    NULL::INTEGER       AS constituency_code,
    NULL::INTEGER       AS ward_code,
    spending_limit_kes,
    total_population    AS population,
    total_area_sq_km    AS area_sq_km,
    'First Schedule'    AS schedule
FROM iebc_presidential_limit WHERE election_year = 2027

UNION ALL

-- Governor
SELECT
    'GOVERNOR'          AS position,
    county_code,
    NULL,
    NULL,
    spending_limit_kes,
    population,
    area_sq_km,
    'Second Schedule'
FROM iebc_county_limits WHERE election_year = 2027

UNION ALL

-- Senator (same county limits)
SELECT
    'SENATOR'           AS position,
    county_code,
    NULL,
    NULL,
    spending_limit_kes,
    population,
    area_sq_km,
    'Second Schedule'
FROM iebc_county_limits WHERE election_year = 2027

UNION ALL

-- Women Rep (same county limits)
SELECT
    'WOMEN_REP'         AS position,
    county_code,
    NULL,
    NULL,
    spending_limit_kes,
    population,
    area_sq_km,
    'Second Schedule'
FROM iebc_county_limits WHERE election_year = 2027

UNION ALL

-- Member of Parliament (constituency limits)
SELECT
    'MP'                AS position,
    county_code,
    constituency_code,
    NULL,
    spending_limit_kes,
    population,
    area_sq_km,
    'Third Schedule'
FROM iebc_constituency_limits WHERE election_year = 2027;

-- ─────────────────────────────────────────────────────────────
-- Index for fast lookups
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_iebc_county_code   ON iebc_county_limits(county_code);
CREATE INDEX IF NOT EXISTS idx_iebc_const_code    ON iebc_constituency_limits(constituency_code);
CREATE INDEX IF NOT EXISTS idx_iebc_const_county  ON iebc_constituency_limits(county_code);
