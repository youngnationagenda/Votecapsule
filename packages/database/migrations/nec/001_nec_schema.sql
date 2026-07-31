-- ============================================================
-- VoteCapsule National Election Core (NEC) — Schema
-- Migration: 001_nec_schema.sql
-- Version:   2022 IEBC General Election Baseline
-- Generated: 2026-07-30
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- COUNTRIES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_countries (
    id              SERIAL PRIMARY KEY,
    iso_code        CHAR(3)      NOT NULL UNIQUE,
    name            VARCHAR(150) NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- COUNTIES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_counties (
    id                   SERIAL PRIMARY KEY,
    country_id           INTEGER      NOT NULL REFERENCES nec_countries(id),
    iebc_code            CHAR(3)      NOT NULL UNIQUE,   -- e.g. "001"
    name                 VARCHAR(150) NOT NULL,
    registered_voters    INTEGER      NOT NULL DEFAULT 0,
    is_special           BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE for PRISONS(049), DIASPORA(291)
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nec_counties_code ON nec_counties(iebc_code);

-- ──────────────────────────────────────────────────────────
-- CONSTITUENCIES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_constituencies (
    id                   SERIAL PRIMARY KEY,
    county_id            INTEGER      NOT NULL REFERENCES nec_counties(id),
    iebc_code            CHAR(3)      NOT NULL UNIQUE,   -- e.g. "001"
    name                 VARCHAR(150) NOT NULL,
    registered_voters    INTEGER      NOT NULL DEFAULT 0,
    is_special           BOOLEAN      NOT NULL DEFAULT FALSE,
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nec_const_code    ON nec_constituencies(iebc_code);
CREATE INDEX idx_nec_const_county  ON nec_constituencies(county_id);

-- ──────────────────────────────────────────────────────────
-- WARDS (County Assembly Wards)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_wards (
    id                   SERIAL PRIMARY KEY,
    constituency_id      INTEGER      NOT NULL REFERENCES nec_constituencies(id),
    iebc_code            CHAR(4)      NOT NULL UNIQUE,   -- e.g. "0001"
    name                 VARCHAR(150) NOT NULL,
    registered_voters    INTEGER      NOT NULL DEFAULT 0,
    is_special           BOOLEAN      NOT NULL DEFAULT FALSE,
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nec_wards_code   ON nec_wards(iebc_code);
CREATE INDEX idx_nec_wards_const  ON nec_wards(constituency_id);

-- ──────────────────────────────────────────────────────────
-- REGISTRATION CENTRES (Polling Centres)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_registration_centres (
    id                   SERIAL PRIMARY KEY,
    ward_id              INTEGER      NOT NULL REFERENCES nec_wards(id),
    iebc_code            CHAR(13)     NOT NULL UNIQUE,   -- 13-digit code from IEBC
    name                 VARCHAR(250) NOT NULL,
    registered_voters    INTEGER      NOT NULL DEFAULT 0,
    polling_station_count INTEGER     NOT NULL DEFAULT 0,
    latitude             NUMERIC(10,7),                  -- GPS — nullable until enriched
    longitude            NUMERIC(10,7),
    is_special           BOOLEAN      NOT NULL DEFAULT FALSE,
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nec_centres_code  ON nec_registration_centres(iebc_code);
CREATE INDEX idx_nec_centres_ward  ON nec_registration_centres(ward_id);

-- ──────────────────────────────────────────────────────────
-- POLLING STATIONS (Streams)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_polling_stations (
    id                   SERIAL PRIMARY KEY,
    registration_centre_id INTEGER    NOT NULL REFERENCES nec_registration_centres(id),
    ward_id              INTEGER      NOT NULL REFERENCES nec_wards(id),
    constituency_id      INTEGER      NOT NULL REFERENCES nec_constituencies(id),
    county_id            INTEGER      NOT NULL REFERENCES nec_counties(id),
    iebc_station_code    CHAR(15)     NOT NULL UNIQUE,   -- 15-digit IEBC code
    stream_number        SMALLINT     NOT NULL,
    name                 VARCHAR(250) NOT NULL,
    registered_voters    INTEGER      NOT NULL DEFAULT 0,
    latitude             NUMERIC(10,7),                  -- GPS — nullable until enriched
    longitude            NUMERIC(10,7),
    station_type         VARCHAR(20)  NOT NULL DEFAULT 'STANDARD',
                                                         -- STANDARD | PRISON | DIASPORA
    is_special           BOOLEAN      NOT NULL DEFAULT FALSE,
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    election_year        SMALLINT     NOT NULL DEFAULT 2022,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nec_ps_code        ON nec_polling_stations(iebc_station_code);
CREATE INDEX idx_nec_ps_centre      ON nec_polling_stations(registration_centre_id);
CREATE INDEX idx_nec_ps_ward        ON nec_polling_stations(ward_id);
CREATE INDEX idx_nec_ps_constituency ON nec_polling_stations(constituency_id);
CREATE INDEX idx_nec_ps_county      ON nec_polling_stations(county_id);
CREATE INDEX idx_nec_ps_type        ON nec_polling_stations(station_type);
CREATE INDEX idx_nec_ps_year        ON nec_polling_stations(election_year);

-- ──────────────────────────────────────────────────────────
-- NEC ELECTION VERSIONS (for multi-cycle support)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_election_versions (
    id                   SERIAL PRIMARY KEY,
    election_year        SMALLINT     NOT NULL UNIQUE,
    label                VARCHAR(100) NOT NULL,          -- "2022 General Election"
    gazette_reference    VARCHAR(200),
    is_active            BOOLEAN      NOT NULL DEFAULT FALSE,
    total_stations       INTEGER      NOT NULL DEFAULT 0,
    total_voters         INTEGER      NOT NULL DEFAULT 0,
    seeded_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- NEC IMPORT LOG (audit trail for all data loads)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nec_import_log (
    id                   SERIAL PRIMARY KEY,
    import_type          VARCHAR(100) NOT NULL,
    source_file          VARCHAR(500) NOT NULL,
    records_imported     INTEGER      NOT NULL DEFAULT 0,
    status               VARCHAR(50)  NOT NULL DEFAULT 'pending',
    notes                TEXT,
    imported_by          VARCHAR(100),
    started_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ
);
