-- ============================================================
-- VoteCapsule™ — IEBC Form Collation Schema
-- Migration: 022_iebc_form_collation.sql
--
-- Implements the full IEBC Form A → B → C result chain with
-- mathematical reconciliation at each level.
--
-- Form A = Polling Station results (captured by field agents via mobile app)
--          Stored in: evidence_capsules + tally_data (JSONB)
--
-- Form B = Constituency/Ward tally (entered by Returning Officers at CTCs)
--          Must reconcile: SUM(all Form As in constituency) == Form B totals
--          Tables: iebc_form_b_collations, iebc_form_b_candidates
--
-- Form C = County/National declaration (generated from Form Bs)
--          Tables: iebc_form_c_declarations, iebc_form_c_candidates
--
-- Reconciliation rules (enforced at application layer):
--   1. Form B total valid_votes == SUM(Form A valid_votes) for constituency
--   2. Form B candidate_votes[x] == SUM(Form A candidate_votes[x]) for constituency
--   3. Form B valid_votes == SUM(Form B candidate_votes)
--   4. Form C (presidential) total == SUM(all Form 34Bs nationally)
--   5. All internal: ballots_issued = valid_votes + rejected_ballots + spoilt_ballots
--
-- Reference: Elections (General) Regulations 2012 (LN 36/2017, LN 72/2022)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- FORM B COLLATIONS
-- Constituency/Ward-level tally entered by Returning Officers.
-- One record per position per constituency/ward per election.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_form_b_collations (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id               UUID         NOT NULL,          -- FK to identity_tenants (IEBC tenant)
    election_id             UUID         NOT NULL,          -- FK to candidate_elections
    election_year           SMALLINT     NOT NULL,

    -- Position being tallied
    position_code           VARCHAR(20)  NOT NULL,          -- PRESIDENT | MP | MCA | GOVERNOR | SENATOR | WOMEN_REP
    form_type               VARCHAR(10)  NOT NULL,          -- FORM_34B | FORM_35B | FORM_36B | FORM_37B | FORM_38B | FORM_39B

    -- Geographic scope (matches the Form A scope for this position)
    county_code             CHAR(3)      NOT NULL,
    constituency_code       CHAR(3),                        -- NULL for national-scope (34B at national level)
    ward_code               CHAR(4),                        -- MCA only (Form 36B)

    -- Station summary
    total_stations          INTEGER      NOT NULL DEFAULT 0, -- Total polling stations in scope
    stations_reported       INTEGER      NOT NULL DEFAULT 0, -- Number of Form As received & verified

    -- Aggregated totals (must match SUM of all Form As)
    registered_voters       INTEGER      NOT NULL DEFAULT 0,
    ballots_issued          INTEGER      NOT NULL DEFAULT 0,
    spoilt_ballots          INTEGER      NOT NULL DEFAULT 0,
    rejected_ballots        INTEGER      NOT NULL DEFAULT 0,
    valid_votes             INTEGER      NOT NULL DEFAULT 0,

    -- Reconciliation status
    reconciliation_status   VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    -- PENDING: Form B entered, reconciliation not yet run
    -- MATCHED: SUM(Form As) == Form B totals ✅
    -- DISCREPANCY: SUM(Form As) != Form B totals — discrepancy alert raised
    -- OVERRIDDEN: Discrepancy acknowledged by Senior Returning Officer
    -- AWAITING_FORMS: Not all Form As received yet

    reconciliation_checked_at  TIMESTAMPTZ,
    reconciliation_delta        JSONB,      -- Stores diff if DISCREPANCY: { valid_votes: +3, candidate_id: ... }

    -- Discrepancy handling
    discrepancy_acknowledged_by  UUID,     -- Senior Returning Officer user ID
    discrepancy_acknowledged_at  TIMESTAMPTZ,
    discrepancy_notes            TEXT,

    -- Returning Officer who entered this Form B
    returning_officer_name  VARCHAR(200) NOT NULL,
    returning_officer_id    UUID,         -- Identity Service user UUID
    signed_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    -- DRAFT: Being entered
    -- SUBMITTED: Signed and submitted for reconciliation
    -- VERIFIED: Reconciliation passed
    -- DECLARED: Used in official declaration (Form C)

    gazette_reference       VARCHAR(300),
    notes                   TEXT,

    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_b_election        ON iebc_form_b_collations(election_id);
CREATE INDEX idx_form_b_position        ON iebc_form_b_collations(position_code);
CREATE INDEX idx_form_b_constituency    ON iebc_form_b_collations(constituency_code);
CREATE INDEX idx_form_b_county          ON iebc_form_b_collations(county_code);
CREATE INDEX idx_form_b_reconciliation  ON iebc_form_b_collations(reconciliation_status);
CREATE INDEX idx_form_b_status          ON iebc_form_b_collations(status);

-- Unique: one Form B per position per constituency per election
CREATE UNIQUE INDEX idx_form_b_unique
    ON iebc_form_b_collations(election_id, position_code, county_code, COALESCE(constituency_code, ''), COALESCE(ward_code, ''));

-- ──────────────────────────────────────────────────────────
-- FORM B CANDIDATE RESULTS
-- Per-candidate totals on the Form B (collated from Form As).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_form_b_candidates (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_b_id           UUID        NOT NULL REFERENCES iebc_form_b_collations(id) ON DELETE CASCADE,
    ballot_number       SMALLINT    NOT NULL,       -- Ballot order position
    candidate_name      VARCHAR(200) NOT NULL,      -- Full name as on ballot
    running_mate_name   VARCHAR(200),               -- Presidential (34B) only
    deputy_name         VARCHAR(200),               -- Governor (37B) only
    party_abbreviation  VARCHAR(20)  NOT NULL,      -- e.g. "UDA", "IND"
    party_name          VARCHAR(200),
    votes               INTEGER      NOT NULL DEFAULT 0,  -- Collated total from all Form As
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_b_cand_form    ON iebc_form_b_candidates(form_b_id);
CREATE INDEX idx_form_b_cand_ballot  ON iebc_form_b_candidates(ballot_number);
CREATE UNIQUE INDEX idx_form_b_cand_unique ON iebc_form_b_candidates(form_b_id, ballot_number);

-- ──────────────────────────────────────────────────────────
-- FORM C DECLARATIONS
-- County/National level official declaration.
-- Presidential 34C: national aggregation of all 34Bs
-- Governor 37C / Senator 38C / Women Rep 39C: county aggregation of Bs
-- MP 35B & MCA 36B are already final (no Form C needed for them)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_form_c_declarations (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id               UUID         NOT NULL,
    election_id             UUID         NOT NULL,
    election_year           SMALLINT     NOT NULL,

    position_code           VARCHAR(20)  NOT NULL,
    form_type               VARCHAR(10)  NOT NULL,  -- FORM_34C | FORM_37C | FORM_38C | FORM_39C

    -- Geographic scope
    county_code             CHAR(3),                -- NULL for 34C (national)

    -- Totals (aggregated from all Form Bs in scope)
    total_form_bs           INTEGER      NOT NULL DEFAULT 0,
    total_registered_voters INTEGER      NOT NULL DEFAULT 0,
    total_ballots_issued    INTEGER      NOT NULL DEFAULT 0,
    total_valid_votes       INTEGER      NOT NULL DEFAULT 0,
    total_rejected_ballots  INTEGER      NOT NULL DEFAULT 0,

    -- Declared winner
    winner_candidate_name   VARCHAR(200),
    winner_ballot_number    SMALLINT,
    winner_votes            INTEGER,
    winner_party            VARCHAR(20),
    winner_running_mate     VARCHAR(200), -- Presidential only

    -- Declaration details
    declared_by_name        VARCHAR(200) NOT NULL,  -- Returning Officer / IEBC Chair
    declared_by_id          UUID,
    declared_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    gazette_reference       VARCHAR(300),

    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    -- DRAFT | VERIFIED | PUBLISHED | DISPUTED | NULLIFIED

    notes                   TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_c_election   ON iebc_form_c_declarations(election_id);
CREATE INDEX idx_form_c_position   ON iebc_form_c_declarations(position_code);
CREATE INDEX idx_form_c_county     ON iebc_form_c_declarations(county_code);
CREATE UNIQUE INDEX idx_form_c_unique
    ON iebc_form_c_declarations(election_id, position_code, COALESCE(county_code, 'NATIONAL'));

-- ──────────────────────────────────────────────────────────
-- FORM C CANDIDATE RESULTS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_form_c_candidates (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_c_id           UUID        NOT NULL REFERENCES iebc_form_c_declarations(id) ON DELETE CASCADE,
    ballot_number       SMALLINT    NOT NULL,
    candidate_name      VARCHAR(200) NOT NULL,
    running_mate_name   VARCHAR(200),
    deputy_name         VARCHAR(200),
    party_abbreviation  VARCHAR(20)  NOT NULL,
    total_votes         INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_c_cand_form ON iebc_form_c_candidates(form_c_id);
CREATE UNIQUE INDEX idx_form_c_cand_unique ON iebc_form_c_candidates(form_c_id, ballot_number);

-- ──────────────────────────────────────────────────────────
-- RECONCILIATION ALERTS
-- Auto-generated when Form B totals don't match SUM(Form As).
-- Drives the Authority portal ValidationMonitorPage.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iebc_reconciliation_alerts (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID        NOT NULL,
    election_id         UUID        NOT NULL,
    election_year       SMALLINT    NOT NULL,

    alert_type          VARCHAR(40)  NOT NULL,
    -- FORM_B_MISMATCH: Sum of Form As != Form B total
    -- MISSING_FORM_A: Form B submitted but some Form As not received
    -- INTERNAL_MISMATCH: Within Form B: ballots_issued != valid + rejected + spoilt
    -- CANDIDATE_SUM_MISMATCH: sum(candidate_votes) != valid_votes
    -- TURNOUT_EXCEEDED: ballots_issued > registered_voters

    severity            VARCHAR(10)  NOT NULL DEFAULT 'HIGH',
    -- HIGH: Vote count discrepancy
    -- MEDIUM: Missing forms
    -- LOW: Minor mismatch (1-2 votes, possible clerical error)

    position_code       VARCHAR(20)  NOT NULL,
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_code           CHAR(4),

    form_b_id           UUID REFERENCES iebc_form_b_collations(id),

    description         TEXT         NOT NULL,
    delta_json          JSONB,       -- e.g. {"expected_valid_votes": 1200, "form_b_valid_votes": 1203, "delta": 3}

    status              VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    -- OPEN: Unresolved
    -- UNDER_REVIEW: Senior officer investigating
    -- RESOLVED: Corrected (with note)
    -- DISMISSED: Acknowledged minor error (with note)

    resolved_by         UUID,
    resolved_at         TIMESTAMPTZ,
    resolution_notes    TEXT,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recon_election     ON iebc_reconciliation_alerts(election_id);
CREATE INDEX idx_recon_position     ON iebc_reconciliation_alerts(position_code);
CREATE INDEX idx_recon_status       ON iebc_reconciliation_alerts(status);
CREATE INDEX idx_recon_severity     ON iebc_reconciliation_alerts(severity);
CREATE INDEX idx_recon_constituency ON iebc_reconciliation_alerts(constituency_code);

-- ──────────────────────────────────────────────────────────
-- TALLY DATA ON EVIDENCE CAPSULES
-- The tally_data JSONB column on evidence_capsules stores the
-- full FormTallyData entered by the agent at the polling station.
-- Add the column if not already present.
-- ──────────────────────────────────────────────────────────
ALTER TABLE evidence_capsules
    ADD COLUMN IF NOT EXISTS tally_data           JSONB,
    ADD COLUMN IF NOT EXISTS form_type            VARCHAR(10),
    ADD COLUMN IF NOT EXISTS registered_voters_form INTEGER,     -- From agent's Form A entry
    ADD COLUMN IF NOT EXISTS ballots_issued        INTEGER,
    ADD COLUMN IF NOT EXISTS spoilt_ballots        INTEGER,
    ADD COLUMN IF NOT EXISTS rejected_ballots_form INTEGER,
    ADD COLUMN IF NOT EXISTS valid_votes_form      INTEGER,
    ADD COLUMN IF NOT EXISTS tally_validation_status VARCHAR(20) DEFAULT 'NOT_ENTERED';
    -- NOT_ENTERED | VALID | INTERNAL_MISMATCH | CANDIDATE_SUM_MISMATCH | TURNOUT_EXCEEDED

CREATE INDEX IF NOT EXISTS idx_ev_form_type   ON evidence_capsules(form_type);
CREATE INDEX IF NOT EXISTS idx_ev_tally_valid ON evidence_capsules(tally_validation_status);

-- ── Record migration ─────────────────────────────────────────
INSERT INTO schema_migrations (version, executed_at)
VALUES ('022', NOW())
ON CONFLICT (version) DO NOTHING;
