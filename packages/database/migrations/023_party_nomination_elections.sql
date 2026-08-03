-- ============================================================
-- VoteCapsule™ — Party Nomination Elections Schema
-- Migration: 023_party_nomination_elections.sql
--
-- Extends the election/candidate model to support Political Party
-- Nomination elections as a fully-featured election type.
--
-- VALUE PROPOSITION: Political parties can use VoteCapsule™ to
-- run their internal nominations using the same rigorous integrity
-- chain as the General Election — Form A capture → B collation →
-- reconciliation → trust anchoring. Party nominations become
-- auditable, transparent, and tamper-proof.
--
-- Key design decisions:
-- 1. PARTY_NOMINATION elections follow the exact same IEBC form
--    chain and reconciliation rules as GENERAL elections.
-- 2. Candidates in a PARTY_NOMINATION must all belong to the
--    same party (enforced at application layer + constraint).
-- 3. The election owns a `party_id` FK to identify which party
--    is running the nomination.
-- 4. A Nomination winner can be promoted to the GENERAL election
--    as a PARTY_SPONSORED candidate.
-- 5. CandidateSponsorshipType classifies all candidates across
--    BOTH election types.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Step 1: Add PARTY_NOMINATION to election_type enum
-- ──────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Add PARTY_NOMINATION if not already present
  IF NOT EXISTS (
    SELECT 1 FROM candidate_elections WHERE election_type = 'PARTY_NOMINATION' LIMIT 1
  ) THEN
    -- The enum is stored as VARCHAR — just start using the new value
    -- No ALTER TYPE needed for VARCHAR columns
    RAISE NOTICE 'PARTY_NOMINATION election type ready (VARCHAR column — no ALTER needed)';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- Step 2: Add nomination-specific columns to candidate_elections
-- ──────────────────────────────────────────────────────────
ALTER TABLE candidate_elections
  -- FK to the political party running this nomination
  ADD COLUMN IF NOT EXISTS party_id              UUID,
  -- For PARTY_NOMINATION: which GENERAL election this feeds into
  ADD COLUMN IF NOT EXISTS parent_election_id    UUID REFERENCES candidate_elections(id),
  -- Nomination-specific dates
  ADD COLUMN IF NOT EXISTS nomination_open_date  DATE,
  ADD COLUMN IF NOT EXISTS nomination_voting_date DATE,
  -- Party-level financial requirements
  ADD COLUMN IF NOT EXISTS nomination_fee_kes    NUMERIC(10,2) DEFAULT 0,
  -- Max candidates per position (party can cap how many compete)
  ADD COLUMN IF NOT EXISTS max_candidates_per_position SMALLINT,
  -- Whether nomination results are published publicly
  ADD COLUMN IF NOT EXISTS results_public        BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ce_party          ON candidate_elections(party_id);
CREATE INDEX IF NOT EXISTS idx_ce_parent         ON candidate_elections(parent_election_id);
CREATE INDEX IF NOT EXISTS idx_ce_type           ON candidate_elections(election_type);

-- ──────────────────────────────────────────────────────────
-- Step 3: Add sponsorship and promotion fields to candidates
-- ──────────────────────────────────────────────────────────

-- Sponsorship types:
--   PARTY_SPONSORED: Won or was directly nominated by a political party
--   INDEPENDENT:     Self-sponsored, no party affiliation on ballot
--   SELF_SPONSORED:  Entered a party nomination as party member (before winning/losing)
--   COALITION:       Sponsored by a coalition of parties

ALTER TABLE candidate_candidates
  -- How this candidate is sponsored for the election
  ADD COLUMN IF NOT EXISTS sponsorship_type      VARCHAR(20) NOT NULL DEFAULT 'PARTY_SPONSORED',
  -- PARTY_SPONSORED | INDEPENDENT | SELF_SPONSORED | COALITION

  -- For PARTY_SPONSORED in GENERAL election:
  --   which nomination election produced this candidate?
  ADD COLUMN IF NOT EXISTS nomination_election_id UUID REFERENCES candidate_elections(id),

  -- For PARTY_SPONSORED in GENERAL election:
  --   the original nomination candidate record that won
  ADD COLUMN IF NOT EXISTS promoted_from_candidate_id UUID REFERENCES candidate_candidates(id),

  -- Nomination election result (for candidates in PARTY_NOMINATION elections)
  ADD COLUMN IF NOT EXISTS nomination_won          BOOLEAN,  -- TRUE=won party ticket, FALSE=lost, NULL=not yet decided

  -- IEBC nomination deposit (KES) — for INDEPENDENT candidates
  ADD COLUMN IF NOT EXISTS iebc_deposit_paid_kes   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS iebc_deposit_receipt_no VARCHAR(100),

  -- Nomination clearance fields (party + IEBC both clear candidates)
  ADD COLUMN IF NOT EXISTS party_cleared_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS party_cleared_by        UUID,
  ADD COLUMN IF NOT EXISTS iebc_nomination_ref     VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_cc_sponsorship        ON candidate_candidates(sponsorship_type);
CREATE INDEX IF NOT EXISTS idx_cc_nomination_election ON candidate_candidates(nomination_election_id);
CREATE INDEX IF NOT EXISTS idx_cc_nomination_won      ON candidate_candidates(nomination_won);

-- ──────────────────────────────────────────────────────────
-- Step 4: Party Nomination Rules table
-- Stores per-party-nomination constraints validated by the service
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_nomination_rules (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id             UUID        NOT NULL REFERENCES candidate_elections(id) ON DELETE CASCADE,
    party_id                UUID        NOT NULL,

    -- Geographic restrictions (nomination may only be for specific county/constituency)
    restrict_county_code    CHAR(3),
    restrict_constituency_code CHAR(3),

    -- Eligibility criteria (stored as JSONB for flexibility)
    eligibility_rules       JSONB,
    -- e.g. { "minAge": 18, "mustBePartyMember": true, "membershipDurationMonths": 12 }

    -- Nomination fee per position level
    fee_national_kes        NUMERIC(10,2) DEFAULT 0,  -- PRESIDENT
    fee_county_kes          NUMERIC(10,2) DEFAULT 0,  -- GOVERNOR / SENATOR / WOMEN_REP
    fee_constituency_kes    NUMERIC(10,2) DEFAULT 0,  -- MP
    fee_ward_kes            NUMERIC(10,2) DEFAULT 0,  -- MCA

    -- One winner per position per nomination
    max_winners_per_position SMALLINT NOT NULL DEFAULT 1,

    -- After nomination: auto-promote winner to parent GENERAL election?
    auto_promote_winner     BOOLEAN NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (election_id, party_id)
);

CREATE INDEX IF NOT EXISTS idx_nom_rules_election ON candidate_nomination_rules(election_id);

-- ──────────────────────────────────────────────────────────
-- Step 5: Promotion log — tracks nomination winner → general
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_promotion_log (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Source: nomination election
    nomination_election_id  UUID        NOT NULL REFERENCES candidate_elections(id),
    nomination_candidate_id UUID        NOT NULL REFERENCES candidate_candidates(id),

    -- Target: general election
    general_election_id     UUID        NOT NULL REFERENCES candidate_elections(id),
    general_candidate_id    UUID        REFERENCES candidate_candidates(id),  -- NULL until promoted

    -- Promotion status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING: Nomination winner identified, awaiting promotion
    -- PROMOTED: Successfully registered in general election
    -- REJECTED: IEBC rejected promotion (e.g. failed vetting)
    -- WITHDRAWN: Candidate withdrew after nomination win

    promoted_by             UUID,                   -- User ID who triggered promotion
    promoted_at             TIMESTAMPTZ,
    rejection_reason        TEXT,

    party_id                UUID        NOT NULL,
    position_code           VARCHAR(20) NOT NULL,
    county_code             CHAR(3),
    constituency_code       CHAR(3),
    ward_code               CHAR(4),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prom_nomination ON candidate_promotion_log(nomination_election_id);
CREATE INDEX IF NOT EXISTS idx_prom_general    ON candidate_promotion_log(general_election_id);
CREATE INDEX IF NOT EXISTS idx_prom_status     ON candidate_promotion_log(status);

-- ──────────────────────────────────────────────────────────
-- Step 6: Update the Kenya 2027 General Election to reflect
-- it is the PARENT election for all party nominations
-- (No data change needed — party nominations will link to it
--  via parent_election_id when parties create their nominations)
-- ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_gen_election_id UUID;
BEGIN
  SELECT id INTO v_gen_election_id
  FROM candidate_elections
  WHERE election_type = 'GENERAL' AND election_year = 2027
  LIMIT 1;

  IF v_gen_election_id IS NOT NULL THEN
    -- Mark it as the parent (self-referential is fine — parent_election_id is NULL for GENERAL)
    RAISE NOTICE 'Kenya 2027 General Election ready as nomination parent: %', v_gen_election_id;
  ELSE
    RAISE NOTICE 'Kenya 2027 election not found — run migration 021 first';
  END IF;
END $$;

-- ── Record migration ─────────────────────────────────────────
INSERT INTO schema_migrations (version, executed_at)
VALUES ('023', NOW())
ON CONFLICT (version) DO NOTHING;
