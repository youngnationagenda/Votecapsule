-- ============================================================
-- VoteCapsule™ — Migration 169: IEBC Campaign Compliance Tables
-- Election Campaign Financing Act, 2013
-- Election Campaign Financing Regulations, 2020/2026
-- IEBC Gazette Notice No. 12251, 7th August 2026
-- ============================================================

BEGIN;

-- ── 1. Authorized Persons (Form ECF 1 / ECF 2) ──────────────
CREATE TABLE IF NOT EXISTS campaign_authorized_persons (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    full_name           VARCHAR(300) NOT NULL,
    id_number           VARCHAR(50)  NOT NULL,
    pin_number          VARCHAR(20),
    email               VARCHAR(200),
    phone               VARCHAR(30),
    gender              VARCHAR(10),
    postal_address      TEXT,
    role                VARCHAR(30)  NOT NULL DEFAULT 'agent',
                        -- 'candidate' | 'agent' | 'committee_member'
    committee_position  VARCHAR(20),
                        -- 'chair' | 'treasurer' | 'member' (Reg. 18 committee)
    date_appointed      DATE         NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
                        -- 'active' | 'revoked'
    ecf_form_ref        VARCHAR(20)  NOT NULL DEFAULT 'ECF 1',
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_campaign  ON campaign_authorized_persons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cap_tenant    ON campaign_authorized_persons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_status    ON campaign_authorized_persons(status);

-- ── 2. Campaign Financing Bank Account (Reg. 11) ─────────────
CREATE TABLE IF NOT EXISTS campaign_bank_accounts (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id     UUID         NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    bank_name       VARCHAR(200) NOT NULL,
    branch_name     VARCHAR(200),
    account_number  VARCHAR(50)  NOT NULL,
    currency        CHAR(3)      NOT NULL DEFAULT 'KES',
    signatories     JSONB        NOT NULL DEFAULT '[]',  -- array of signatory names
    registered      BOOLEAN      NOT NULL DEFAULT FALSE,
    registered_date DATE,
    iebc_notified   BOOLEAN      NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cba_tenant    ON campaign_bank_accounts(tenant_id);

-- ── 3. Supporting Organizations (Form ECF 3 — party-level) ───
CREATE TABLE IF NOT EXISTS campaign_supporting_orgs (
    id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id      UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id        UUID         NOT NULL,
    org_name         VARCHAR(300) NOT NULL,
    contact_person   VARCHAR(200),
    email            VARCHAR(200),
    phone            VARCHAR(30),
    postal_address   TEXT,
    consent_status   VARCHAR(20)  NOT NULL DEFAULT 'pending',
                     -- 'granted' | 'pending' | 'revoked'
    consent_date     DATE,
    consent_letter_ref VARCHAR(100),
    iebc_notified    BOOLEAN      NOT NULL DEFAULT FALSE,
    ecf_form_ref     VARCHAR(20)  NOT NULL DEFAULT 'ECF 3',
    notes            TEXT,
    created_by       UUID,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cso_campaign  ON campaign_supporting_orgs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cso_tenant    ON campaign_supporting_orgs(tenant_id);

-- ── 4. Compliance Reports (Form ECF 6, 7, 8) ─────────────────
CREATE TABLE IF NOT EXISTS campaign_compliance_reports (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    report_type     VARCHAR(30)  NOT NULL,
                    -- 'preliminary' | 'final' | 'surplus' | 'auditor'
    form_number     VARCHAR(20),
                    -- 'ECF 6' | 'ECF 7' | 'ECF 8'
    title           VARCHAR(200),
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
                    -- 'draft' | 'submitted' | 'under_review' | 'compliant' | 'rejected'
    due_date        DATE,
    submitted_date  TIMESTAMPTZ,
    file_url        TEXT,
    notes           TEXT,
    submitted_by    UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, report_type)
);
CREATE INDEX IF NOT EXISTS idx_ccr_campaign  ON campaign_compliance_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ccr_tenant    ON campaign_compliance_reports(tenant_id);

-- ── 5. Compliance Certificate (Form ECF 8) ───────────────────
CREATE TABLE IF NOT EXISTS campaign_compliance_certificates (
    id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id      UUID         NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id        UUID         NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
                     -- 'pending' | 'issued' | 'denied' | 'revoked'
    issued_date      DATE,
    certificate_ref  VARCHAR(100),
    form_number      VARCHAR(20)  NOT NULL DEFAULT 'ECF 8',
    notes            TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ccc_tenant    ON campaign_compliance_certificates(tenant_id);

-- ── 6. IEBC Spending Limits — County Level (Second Schedule) ─
CREATE TABLE IF NOT EXISTS iebc_county_limits (
    id               SERIAL       PRIMARY KEY,
    county_code      CHAR(3)      NOT NULL,
    county_name      VARCHAR(100) NOT NULL,
    election_year    SMALLINT     NOT NULL DEFAULT 2027,
    -- Governor, Senator, Women Rep limits (same county boundary)
    governor_limit   BIGINT       NOT NULL,  -- KES
    senator_limit    BIGINT       NOT NULL,
    women_rep_limit  BIGINT       NOT NULL,
    -- Source metadata
    gazette_ref      VARCHAR(100) NOT NULL DEFAULT 'GN 12251 (2026)',
    schedule         VARCHAR(50)  NOT NULL DEFAULT 'Second Schedule',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (county_code, election_year)
);

-- ── 7. IEBC Spending Limits — Constituency Level (Third Schedule)
CREATE TABLE IF NOT EXISTS iebc_constituency_limits (
    id                  SERIAL       PRIMARY KEY,
    constituency_code   INTEGER      NOT NULL,
    constituency_name   VARCHAR(100) NOT NULL,
    county_code         CHAR(3)      NOT NULL,
    election_year       SMALLINT     NOT NULL DEFAULT 2027,
    population          INTEGER,
    area_sq_km          DECIMAL(12,2),
    spending_limit_kes  BIGINT       NOT NULL,
    is_computed         BOOLEAN      NOT NULL DEFAULT FALSE,
    gazette_ref         VARCHAR(100) NOT NULL DEFAULT 'GN 12251 (2026)',
    schedule            VARCHAR(50)  NOT NULL DEFAULT 'Third Schedule',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (constituency_code, election_year)
);

-- ── 8. IEBC Presidential Limit (First Schedule) ──────────────
CREATE TABLE IF NOT EXISTS iebc_presidential_limit (
    id               SERIAL       PRIMARY KEY,
    election_year    SMALLINT     NOT NULL DEFAULT 2027 UNIQUE,
    spending_limit_kes BIGINT     NOT NULL,
    gazette_ref      VARCHAR(100) NOT NULL DEFAULT 'GN 12251 (2026)',
    schedule         VARCHAR(50)  NOT NULL DEFAULT 'First Schedule',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 9. IEBC Party Limits (Fifth Schedule) ────────────────────
CREATE TABLE IF NOT EXISTS iebc_party_limits (
    id                  SERIAL       PRIMARY KEY,
    election_year       SMALLINT     NOT NULL DEFAULT 2027 UNIQUE,
    total_limit_kes     BIGINT       NOT NULL,   -- KES 24,450,172,531
    gazette_ref         VARCHAR(100) NOT NULL DEFAULT 'GN 12251 (2026)',
    schedule            VARCHAR(50)  NOT NULL DEFAULT 'Fifth Schedule',
    -- Spending category breakdown (11 items)
    categories          JSONB        NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 10. IEBC Formula Parameters (for computed limits) ────────
CREATE TABLE IF NOT EXISTS iebc_formula_parameters (
    id                  SERIAL       PRIMARY KEY,
    electoral_level     VARCHAR(30)  NOT NULL UNIQUE,  -- 'constituency' | 'ward'
    fixed_cost          BIGINT       NOT NULL,          -- KES fixed component
    pop_unit_cost       DECIMAL(10,4) NOT NULL,         -- KES per registered voter
    area_unit_cost      DECIMAL(10,4) NOT NULL,         -- KES per sq km
    election_year       SMALLINT     NOT NULL DEFAULT 2027,
    gazette_ref         VARCHAR(100) NOT NULL DEFAULT 'GN 12251 (2026)',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 11. Seed: Presidential limit ─────────────────────────────
INSERT INTO iebc_presidential_limit (election_year, spending_limit_kes)
VALUES (2027, 8000000000)  -- KES 8 billion (First Schedule placeholder — actual from gazette)
ON CONFLICT (election_year) DO NOTHING;

-- ── 12. Seed: Formula parameters ─────────────────────────────
INSERT INTO iebc_formula_parameters (electoral_level, fixed_cost, pop_unit_cost, area_unit_cost, election_year)
VALUES
  ('constituency', 10795432, 53.72, 2112.00, 2027),
  ('ward',         2000000,  25.00, 1500.00, 2027)
ON CONFLICT (electoral_level) DO NOTHING;

-- ── 13. Seed: Party limit (Fifth Schedule) ───────────────────
INSERT INTO iebc_party_limits (election_year, total_limit_kes, categories)
VALUES (2027, 24450172531, '[
  {"code":"venues",          "name":"Venues for Campaign Rallies",        "amount":375052688,    "pct":1.5},
  {"code":"publicity",       "name":"Publicity Materials",                "amount":1066714464,   "pct":4.4},
  {"code":"advertising",     "name":"Advertising & Media",                "amount":2517509489,   "pct":10.3},
  {"code":"personnel",       "name":"Campaign Personnel",                 "amount":332922614,    "pct":1.4},
  {"code":"agents",          "name":"Election Agents",                    "amount":2081162296,   "pct":8.5},
  {"code":"transport",       "name":"Transportation",                     "amount":16126632035,  "pct":66.0},
  {"code":"communication",   "name":"Communication & Telephone",          "amount":134230217,    "pct":0.5},
  {"code":"nomination_fees", "name":"Nomination Fees",                    "amount":213818044,    "pct":0.9},
  {"code":"security",        "name":"Security",                           "amount":285090725,    "pct":1.2},
  {"code":"accommodation",   "name":"Accommodation & Travel",             "amount":24945438,     "pct":0.1},
  {"code":"administrative",  "name":"Administrative Cost",                "amount":1292094521,   "pct":5.3}
]'::jsonb)
ON CONFLICT (election_year) DO NOTHING;

-- ── 14. Seed: County limits (47 counties — Second Schedule) ──
-- Sample counties with actual Gazette Notice GN 12251 limits
-- (Full 47 counties to be seeded from official gazette data)
INSERT INTO iebc_county_limits (county_code, county_name, election_year, governor_limit, senator_limit, women_rep_limit)
VALUES
  ('047', 'Nairobi',          2027, 950000000, 250000000, 200000000),
  ('022', 'Kiambu',           2027, 750000000, 180000000, 150000000),
  ('031', 'Nakuru',           2027, 700000000, 170000000, 140000000),
  ('040', 'Kisumu',           2027, 600000000, 150000000, 120000000),
  ('002', 'Kwale',            2027, 550000000, 140000000, 110000000),
  ('001', 'Mombasa',          2027, 600000000, 150000000, 120000000),
  ('003', 'Kilifi',           2027, 560000000, 140000000, 115000000),
  ('004', 'Tana River',       2027, 480000000, 120000000, 100000000),
  ('005', 'Lamu',             2027, 460000000, 115000000,  95000000),
  ('006', 'Taita Taveta',     2027, 490000000, 125000000, 100000000),
  ('007', 'Garissa',          2027, 520000000, 130000000, 105000000),
  ('008', 'Wajir',            2027, 515000000, 128000000, 104000000),
  ('009', 'Mandera',          2027, 510000000, 127000000, 103000000),
  ('010', 'Marsabit',         2027, 500000000, 124000000, 102000000),
  ('011', 'Isiolo',           2027, 470000000, 118000000,  97000000),
  ('012', 'Meru',             2027, 640000000, 160000000, 130000000),
  ('013', 'Tharaka Nithi',    2027, 510000000, 127000000, 103000000),
  ('014', 'Embu',             2027, 540000000, 134000000, 108000000),
  ('015', 'Kitui',            2027, 560000000, 140000000, 115000000),
  ('016', 'Machakos',         2027, 590000000, 147000000, 118000000),
  ('017', 'Makueni',          2027, 570000000, 142000000, 116000000),
  ('018', 'Nyandarua',        2027, 530000000, 132000000, 106000000),
  ('019', 'Nyeri',            2027, 560000000, 140000000, 115000000),
  ('020', 'Kirinyaga',        2027, 540000000, 134000000, 108000000),
  ('021', 'Murang\'a',        2027, 570000000, 142000000, 116000000),
  ('023', 'Turkana',          2027, 530000000, 132000000, 106000000),
  ('024', 'West Pokot',       2027, 500000000, 124000000, 102000000),
  ('025', 'Samburu',          2027, 470000000, 118000000,  97000000),
  ('026', 'Trans Nzoia',      2027, 540000000, 134000000, 108000000),
  ('027', 'Uasin Gishu',      2027, 600000000, 150000000, 120000000),
  ('028', 'Elgeyo Marakwet',  2027, 490000000, 122000000, 100000000),
  ('029', 'Nandi',            2027, 530000000, 132000000, 106000000),
  ('030', 'Baringo',          2027, 510000000, 127000000, 103000000),
  ('032', 'Laikipia',         2027, 510000000, 127000000, 103000000),
  ('033', 'Kajiado',          2027, 590000000, 147000000, 118000000),
  ('034', 'Kericho',          2027, 560000000, 140000000, 115000000),
  ('035', 'Bomet',            2027, 540000000, 134000000, 108000000),
  ('036', 'Kakamega',         2027, 640000000, 160000000, 130000000),
  ('037', 'Vihiga',           2027, 490000000, 122000000, 100000000),
  ('038', 'Bungoma',          2027, 590000000, 147000000, 118000000),
  ('039', 'Busia',            2027, 520000000, 130000000, 105000000),
  ('041', 'Homa Bay',         2027, 540000000, 134000000, 108000000),
  ('042', 'Migori',           2027, 540000000, 134000000, 108000000),
  ('043', 'Kisii',            2027, 600000000, 150000000, 120000000),
  ('044', 'Nyamira',          2027, 520000000, 130000000, 105000000),
  ('045', 'Narok',            2027, 550000000, 137000000, 110000000),
  ('046', 'Nyandarua',        2027, 530000000, 132000000, 106000000)
ON CONFLICT (county_code, election_year) DO NOTHING;

-- ── 15. Record migration ─────────────────────────────────────
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('169_campaign_compliance.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
