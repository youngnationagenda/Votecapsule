-- ============================================================
-- VoteCapsule™ — Reporting Service Schema
-- Migration: 017_reporting_schema.sql
--
-- Stores pre-computed result snapshots and publication records.
-- Raw data is aggregated from evidence_capsules + ai_verification_jobs
-- (same Aurora DB — no cross-service HTTP needed for aggregation).
--
-- Table prefix: reporting_*
--
-- Publication model:
--   DRAFT     → computed but not verified
--   VERIFIED  → Election Authority has reviewed
--   PUBLISHED → officially released; visible to PUBLIC role
--
-- AI ASSISTS, HUMANS DECIDE.
-- A human Election Authority must explicitly publish results.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- RESULT SNAPSHOTS
-- Pre-computed aggregations at every geographic level.
-- Recomputed on demand via POST /reports/snapshots/compute.
-- Keyed by (tenant, election, position, scope_level, scope_code).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reporting_result_snapshots (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id               UUID         NOT NULL,
    election_id             UUID,                              -- FK to candidate_elections.id (nullable for legacy)
    election_year           SMALLINT     NOT NULL,
    position_code           VARCHAR(20)  NOT NULL,             -- PRESIDENT | GOVERNOR | SENATOR | WOMEN_REP | MP | MCA

    -- Geographic scope — only one level is set per row
    scope_level             VARCHAR(20)  NOT NULL,             -- NATIONAL | COUNTY | CONSTITUENCY | WARD | STATION
    county_code             CHAR(3),                           -- set for COUNTY / CONSTITUENCY / WARD / STATION
    constituency_code       CHAR(3),                           -- set for CONSTITUENCY / WARD / STATION
    ward_code               CHAR(4),                           -- set for WARD / STATION
    iebc_station_code       CHAR(15),                          -- set for STATION only
    scope_name              VARCHAR(250),                      -- human-readable name (denormalised for export)

    -- Coverage
    total_stations          INTEGER      NOT NULL DEFAULT 0,   -- NEC expected station count for this scope
    stations_reporting      INTEGER      NOT NULL DEFAULT 0,   -- capsules in ANCHORED or PUBLISHED
    stations_pending        INTEGER      NOT NULL DEFAULT 0,   -- not yet submitted
    stations_rejected       INTEGER      NOT NULL DEFAULT 0,   -- REJECTED capsules
    stations_flagged        INTEGER      NOT NULL DEFAULT 0,   -- AI-flagged for anomalies
    completion_percent      NUMERIC(5,2) NOT NULL DEFAULT 0,   -- stations_reporting / total_stations * 100

    -- Vote totals (aggregated from AI OCR extraction)
    registered_voters       INTEGER      NOT NULL DEFAULT 0,
    votes_cast              INTEGER      NOT NULL DEFAULT 0,
    valid_votes             INTEGER      NOT NULL DEFAULT 0,
    rejected_ballots        INTEGER      NOT NULL DEFAULT 0,   -- rejected_ballots ≠ rejected capsules
    turnout_percent         NUMERIC(5,2) NOT NULL DEFAULT 0,   -- votes_cast / registered_voters * 100

    -- Quality
    avg_ai_confidence       NUMERIC(5,4),                      -- average AI confidence across reporting stations
    min_ai_confidence       NUMERIC(5,4),                      -- lowest confidence in scope (risk indicator)
    anomaly_count           INTEGER      NOT NULL DEFAULT 0,   -- total AI anomaly events in scope

    -- Snapshot metadata
    is_final                BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE once completion_percent = 100
    computed_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    compute_duration_ms     INTEGER,

    -- Publication
    publication_status      VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
                                                               -- DRAFT | VERIFIED | PUBLISHED
    verified_by             UUID,                              -- user ID of verifying official
    verified_at             TIMESTAMPTZ,
    published_by            UUID,                              -- user ID of publishing official
    published_at            TIMESTAMPTZ,

    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rrs_tenant       ON reporting_result_snapshots(tenant_id);
CREATE INDEX idx_rrs_election     ON reporting_result_snapshots(election_year);
CREATE INDEX idx_rrs_position     ON reporting_result_snapshots(position_code);
CREATE INDEX idx_rrs_scope        ON reporting_result_snapshots(scope_level);
CREATE INDEX idx_rrs_county       ON reporting_result_snapshots(county_code);
CREATE INDEX idx_rrs_const        ON reporting_result_snapshots(constituency_code);
CREATE INDEX idx_rrs_ward         ON reporting_result_snapshots(ward_code);
CREATE INDEX idx_rrs_station      ON reporting_result_snapshots(iebc_station_code);
CREATE INDEX idx_rrs_pub_status   ON reporting_result_snapshots(publication_status);

-- Natural key: unique snapshot per (tenant, election_year, position, scope_level, scope_code)
CREATE UNIQUE INDEX idx_rrs_natural_key ON reporting_result_snapshots(
    tenant_id, election_year, position_code, scope_level,
    COALESCE(iebc_station_code, ''),
    COALESCE(ward_code, ''),
    COALESCE(constituency_code, ''),
    COALESCE(county_code, '')
);

-- ──────────────────────────────────────────────────────────
-- PUBLICATIONS
-- Immutable record every time results are officially published.
-- An election authority can publish partial results (county-by-county)
-- or all results at once.
-- AI ASSISTS, HUMANS DECIDE — only a human can create a publication.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reporting_publications (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    election_year       SMALLINT     NOT NULL,
    position_code       VARCHAR(20)  NOT NULL,
    scope_level         VARCHAR(20)  NOT NULL,
    scope_code          VARCHAR(20),                           -- county/const/ward/station code, NULL = national

    -- Snapshot this publication is based on
    snapshot_id         UUID         NOT NULL REFERENCES reporting_result_snapshots(id),

    -- Vote totals at time of publication (immutable snapshot)
    stations_reporting  INTEGER      NOT NULL DEFAULT 0,
    total_stations      INTEGER      NOT NULL DEFAULT 0,
    votes_cast          INTEGER      NOT NULL DEFAULT 0,
    valid_votes         INTEGER      NOT NULL DEFAULT 0,
    rejected_ballots    INTEGER      NOT NULL DEFAULT 0,
    turnout_percent     NUMERIC(5,2) NOT NULL DEFAULT 0,
    completion_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,

    -- Authorisation
    published_by        UUID         NOT NULL,                 -- Identity Service user ID
    published_by_name   VARCHAR(300),
    gazette_reference   VARCHAR(300),
    notes               TEXT,

    -- Visibility
    is_public           BOOLEAN      NOT NULL DEFAULT FALSE,   -- TRUE = visible without auth
    publication_version SMALLINT     NOT NULL DEFAULT 1,       -- increments on re-publication

    published_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rp_tenant    ON reporting_publications(tenant_id);
CREATE INDEX idx_rp_election  ON reporting_publications(election_year);
CREATE INDEX idx_rp_position  ON reporting_publications(position_code);
CREATE INDEX idx_rp_pub_at    ON reporting_publications(published_at);
CREATE INDEX idx_rp_public    ON reporting_publications(is_public) WHERE is_public = TRUE;

-- ──────────────────────────────────────────────────────────
-- EXPORT AUDIT LOG
-- Every export (PDF, Excel, CSV) is logged for accountability.
-- Supports IEBC audit requirements.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reporting_export_log (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID         NOT NULL,
    requested_by    UUID         NOT NULL,                     -- Identity Service user ID
    export_format   VARCHAR(10)  NOT NULL,                     -- PDF | EXCEL | CSV
    scope_level     VARCHAR(20)  NOT NULL,
    position_code   VARCHAR(20),
    election_year   SMALLINT,
    county_code     CHAR(3),
    constituency_code CHAR(3),
    ward_code       CHAR(4),

    -- Result
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',   -- PENDING | COMPLETE | FAILED
    row_count       INTEGER,
    file_size_bytes INTEGER,
    s3_key          VARCHAR(500),                              -- stored in assets bucket
    error_message   TEXT,

    requested_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_rel_tenant   ON reporting_export_log(tenant_id);
CREATE INDEX idx_rel_user     ON reporting_export_log(requested_by);
CREATE INDEX idx_rel_format   ON reporting_export_log(export_format);
CREATE INDEX idx_rel_at       ON reporting_export_log(requested_at);
