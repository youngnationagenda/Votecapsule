-- ============================================================
-- VoteCapsule™ — Candidate Service Schema
-- Migration: 016_candidate_schema.sql
--
-- Stores elections, positions, political parties, and candidates.
-- All geography references use NEC iebc_code values — the
-- Geography Service (NEC SSoT) is the single source of truth.
-- This service NEVER duplicates county/constituency/ward names.
--
-- Table prefix: candidate_*
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- ELECTIONS
-- An election cycle (e.g. Kenya 2027 General Election).
-- Multi-tenant: each tenant (election authority) owns their elections.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_elections (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID         NOT NULL,                 -- FK to identity_tenants
    name                VARCHAR(200) NOT NULL,                 -- "Kenya 2027 General Election"
    election_type       VARCHAR(50)  NOT NULL DEFAULT 'GENERAL',
                                                               -- GENERAL | BY_ELECTION | REPEAT
    election_year       SMALLINT     NOT NULL,                 -- 2027
    election_date       DATE,                                  -- official election day
    nomination_deadline DATE,
    campaign_start_date DATE,
    campaign_end_date   DATE,
    gazette_reference   VARCHAR(300),                          -- Legal gazette notice reference
    description         TEXT,
    status              VARCHAR(30)  NOT NULL DEFAULT 'PLANNING',
                                                               -- PLANNING | NOMINATION | CAMPAIGN | ACTIVE | CLOSED | CANCELLED
    nec_election_year   SMALLINT,                              -- FK reference to nec_election_versions.election_year (NEC SSoT)
    is_active           BOOLEAN      NOT NULL DEFAULT FALSE,   -- Only one election is active at a time
    created_by          UUID,                                  -- User ID (Identity Service)
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ce_tenant      ON candidate_elections(tenant_id);
CREATE INDEX idx_ce_year        ON candidate_elections(election_year);
CREATE INDEX idx_ce_status      ON candidate_elections(status);
CREATE INDEX idx_ce_active      ON candidate_elections(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_ce_tenant_year_type
    ON candidate_elections(tenant_id, election_year, election_type);

-- ──────────────────────────────────────────────────────────
-- ELECTION POSITIONS
-- Every elective office contested in a given election.
-- Linked to a geographic scope via NEC iebc codes.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_election_positions (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id             UUID         NOT NULL REFERENCES candidate_elections(id) ON DELETE CASCADE,
    position_code           VARCHAR(20)  NOT NULL,   -- PRESIDENT | GOVERNOR | SENATOR | WOMEN_REP | MP | MCA
    position_name           VARCHAR(150) NOT NULL,   -- "Member of National Assembly"
    geographic_level        VARCHAR(20)  NOT NULL,   -- NATIONAL | COUNTY | CONSTITUENCY | WARD
    -- NEC geography references (iebc codes — never denormalised names)
    county_code             CHAR(3),                 -- for COUNTY/CONSTITUENCY/WARD scope
    constituency_code       CHAR(3),                 -- for CONSTITUENCY/WARD scope
    ward_code               CHAR(4),                 -- for WARD scope (MCA only)
    -- Forms & balloting
    iebc_form_number        VARCHAR(20),             -- e.g. "Form 35A", "Form 37B"
    max_candidates          SMALLINT,                -- optional cap per party
    is_running_mate_required BOOLEAN     NOT NULL DEFAULT FALSE,   -- TRUE for Presidential (VP)
    seats_available         SMALLINT     NOT NULL DEFAULT 1,
    -- Metadata
    description             TEXT,
    sort_order              SMALLINT     NOT NULL DEFAULT 0,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cep_election   ON candidate_election_positions(election_id);
CREATE INDEX idx_cep_code       ON candidate_election_positions(position_code);
CREATE INDEX idx_cep_county     ON candidate_election_positions(county_code);
CREATE INDEX idx_cep_const      ON candidate_election_positions(constituency_code);
CREATE INDEX idx_cep_ward       ON candidate_election_positions(ward_code);
CREATE UNIQUE INDEX idx_cep_election_code_scope
    ON candidate_election_positions(election_id, position_code, county_code, constituency_code, ward_code);

-- ──────────────────────────────────────────────────────────
-- POLITICAL PARTIES
-- Registered parties that can field candidates.
-- Independent candidates are NOT stored here — the flag is on
-- the candidate record itself.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_political_parties (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    party_code          VARCHAR(20)  NOT NULL UNIQUE,  -- e.g. "ODM", "UDA", "ANC"
    name                VARCHAR(200) NOT NULL,
    abbreviation        VARCHAR(20)  NOT NULL,
    party_color         CHAR(7),                       -- hex e.g. "#FF6600" — display only
    logo_url            VARCHAR(500),                  -- S3 URL via assets bucket
    registration_number VARCHAR(100),                  -- IEBC registration number
    registration_date   DATE,
    chairperson_name    VARCHAR(200),
    headquarters        VARCHAR(300),
    gazette_reference   VARCHAR(300),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    country_code        CHAR(3)      NOT NULL DEFAULT 'KEN',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cpp_code    ON candidate_political_parties(party_code);
CREATE INDEX idx_cpp_active  ON candidate_political_parties(is_active);
CREATE INDEX idx_cpp_country ON candidate_political_parties(country_code);

-- ──────────────────────────────────────────────────────────
-- CANDIDATES
-- A person contesting a specific position in a specific election.
-- One person may appear as multiple candidate records if they
-- contest different positions (e.g. MP + MCA = 2 rows — not allowed
-- in Kenya but supported for other countries).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_candidates (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id             UUID         NOT NULL REFERENCES candidate_elections(id),
    position_id             UUID         NOT NULL REFERENCES candidate_election_positions(id),
    party_id                UUID         REFERENCES candidate_political_parties(id),  -- NULL if independent
    tenant_id               UUID         NOT NULL,

    -- Identity
    full_name               VARCHAR(300) NOT NULL,
    short_name              VARCHAR(150),                          -- display name on ballot
    national_id             VARCHAR(30)  NOT NULL,                 -- Kenya National ID / Passport
    date_of_birth           DATE,
    gender                  VARCHAR(10),                           -- MALE | FEMALE | OTHER

    -- Classification
    is_independent          BOOLEAN      NOT NULL DEFAULT FALSE,
    ballot_number           SMALLINT,                              -- assigned after nomination
    ballot_order            SMALLINT,                              -- display order on form

    -- Running mate (Presidential only)
    running_mate_name       VARCHAR(300),
    running_mate_national_id VARCHAR(30),

    -- Geography (NEC iebc codes — SSoT reference, never duplicated names)
    county_code             CHAR(3),                               -- for COUNTY/CONST/WARD scope
    constituency_code       CHAR(3),                               -- for CONST/WARD scope
    ward_code               CHAR(4),                               -- for WARD scope (MCA)

    -- Media / Documents
    photograph_url          VARCHAR(500),                          -- S3 assets bucket
    symbol_url              VARCHAR(500),                          -- campaign symbol/logo
    nomination_cert_url     VARCHAR(500),                          -- scanned IEBC form
    nomination_cert_number  VARCHAR(100),

    -- Status lifecycle
    status                  VARCHAR(30)  NOT NULL DEFAULT 'PENDING_NOMINATION',
                                         -- PENDING_NOMINATION | NOMINATED | APPROVED | WITHDRAWN | DISQUALIFIED | ELECTED | NOT_ELECTED
    disqualification_reason TEXT,
    withdrawal_date         DATE,
    nomination_date         DATE,
    gazette_reference       VARCHAR(300),

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cc_election    ON candidate_candidates(election_id);
CREATE INDEX idx_cc_position    ON candidate_candidates(position_id);
CREATE INDEX idx_cc_party       ON candidate_candidates(party_id);
CREATE INDEX idx_cc_tenant      ON candidate_candidates(tenant_id);
CREATE INDEX idx_cc_status      ON candidate_candidates(status);
CREATE INDEX idx_cc_county      ON candidate_candidates(county_code);
CREATE INDEX idx_cc_const       ON candidate_candidates(constituency_code);
CREATE INDEX idx_cc_ward        ON candidate_candidates(ward_code);
CREATE INDEX idx_cc_national_id ON candidate_candidates(national_id);
-- Unique: one candidate per position per national ID per election
CREATE UNIQUE INDEX idx_cc_election_position_id
    ON candidate_candidates(election_id, position_id, national_id);

-- ──────────────────────────────────────────────────────────
-- CANDIDATE STATUS AUDIT LOG
-- Immutable record of every status transition.
-- Supports investigation and legal challenges.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_status_log (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id    UUID         NOT NULL REFERENCES candidate_candidates(id),
    from_status     VARCHAR(30),
    to_status       VARCHAR(30)  NOT NULL,
    changed_by      UUID         NOT NULL,    -- User ID (Identity Service)
    reason          TEXT,
    gazette_ref     VARCHAR(300),
    changed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_csl_candidate ON candidate_status_log(candidate_id);
CREATE INDEX idx_csl_changed   ON candidate_status_log(changed_at);

-- ──────────────────────────────────────────────────────────
-- AI BALLOT REFERENCE DATA
-- Candidate names as they appear on the physical IEBC ballot form.
-- Used by AI Verification Service for OCR cross-validation.
-- Must match exactly what is printed on Form 35A / 35B / 37.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_ballot_references (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id        UUID         NOT NULL REFERENCES candidate_candidates(id) ON DELETE CASCADE,
    position_id         UUID         NOT NULL REFERENCES candidate_election_positions(id),
    iebc_station_code   CHAR(15),                          -- NULL = all stations in scope
    ballot_name         VARCHAR(300) NOT NULL,             -- EXACTLY as printed on ballot
    ballot_symbol       VARCHAR(100),                      -- symbol description for OCR
    ballot_number       SMALLINT     NOT NULL,             -- number on the printed ballot
    form_number         VARCHAR(20),                       -- "Form 35A"
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cbr_candidate ON candidate_ballot_references(candidate_id);
CREATE INDEX idx_cbr_position  ON candidate_ballot_references(position_id);
CREATE INDEX idx_cbr_station   ON candidate_ballot_references(iebc_station_code);
CREATE INDEX idx_cbr_form      ON candidate_ballot_references(form_number);
