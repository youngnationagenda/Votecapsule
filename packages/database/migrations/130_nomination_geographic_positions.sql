-- ============================================================
-- VoteCapsule(tm) -- Migration 130
-- Nomination Geographic Positions + Subscription Limits
-- + Nomination Disputes + Candidate-Party Bridge support
--
-- NOTE: candidate_elections already has position_code,
-- county_code, constituency_code, ward_code columns
-- (added in migration 023). This migration adds:
--   - tenant_nomination_limits table
--   - candidate_nomination_disputes table
--   - gender column on candidate_candidates (if not exists)
--   - Indexes for geographic nomination queries
--   - CHECK constraint: no PRESIDENT in nominations
--   - Subscription limits seeded for all 98 party tenants
--
-- Generated: 2026-08-12 by Sonie (v2 — correct schema)
-- ============================================================

BEGIN;

-- ── 1. Indexes for geographic nomination queries ───────────────────────
-- candidate_elections already has position_code/county_code etc.
CREATE INDEX IF NOT EXISTS idx_elections_position_county
  ON candidate_elections(position_code, county_code)
  WHERE election_type = 'NOMINATION';

CREATE INDEX IF NOT EXISTS idx_elections_position_constituency
  ON candidate_elections(position_code, constituency_code)
  WHERE election_type = 'NOMINATION';

CREATE INDEX IF NOT EXISTS idx_elections_tenant_nomination
  ON candidate_elections(tenant_id, election_type)
  WHERE election_type = 'NOMINATION';

-- ── 2. CHECK: no PRESIDENT in NOMINATION elections ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_nomination_no_president'
      AND table_name = 'candidate_elections'
  ) THEN
    ALTER TABLE candidate_elections
      ADD CONSTRAINT chk_nomination_no_president
        CHECK (
          election_type != 'NOMINATION'
          OR position_code IS NULL
          OR position_code IN ('GOVERNOR', 'SENATOR', 'WOMEN_REP', 'MP', 'MCA')
        );
  END IF;
END $$;

-- ── 3. gender column on candidate_candidates ───────────────────────────
ALTER TABLE candidate_candidates
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    CHECK (gender IN ('MALE', 'FEMALE', 'OTHER') OR gender IS NULL);

-- ── 4. Tenant nomination limits table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_nomination_limits (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  max_nominations                INT NOT NULL DEFAULT 50,
  max_candidates_per_nomination  INT NOT NULL DEFAULT 6,
  allowed_positions              TEXT[] DEFAULT '{}',
  can_run_nominations            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

COMMENT ON TABLE tenant_nomination_limits IS
  'Subscription-based limits on nomination capabilities per tenant.';
COMMENT ON COLUMN tenant_nomination_limits.allowed_positions IS
  'Empty array = all positions allowed. Non-empty = restricted to listed positions.';

-- ── 5. Seed default limits for all political party tenants ─────────────
INSERT INTO tenant_nomination_limits (
  tenant_id,
  max_nominations,
  max_candidates_per_nomination,
  can_run_nominations
)
SELECT id, 50, 6, TRUE
FROM tenants
WHERE type = 'political_party'
  AND deleted_at IS NULL
ON CONFLICT (tenant_id) DO NOTHING;

-- ── 6. Nomination disputes table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_nomination_disputes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_election_id   UUID NOT NULL REFERENCES candidate_elections(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filed_by                 UUID NOT NULL,
  filed_by_name            VARCHAR(200),
  against_candidate_id     UUID,
  against_candidate_name   VARCHAR(200),
  category                 VARCHAR(30) NOT NULL
                             CHECK (category IN (
                               'RIGGING', 'BRIBERY', 'VIOLENCE', 'ELIGIBILITY',
                               'PROCESS', 'GENDER_RULE', 'OTHER'
                             )),
  description              TEXT NOT NULL,
  evidence_urls            TEXT[] DEFAULT '{}',
  status                   VARCHAR(20) NOT NULL DEFAULT 'FILED'
                             CHECK (status IN (
                               'FILED', 'UNDER_REVIEW', 'EVIDENCE',
                               'HEARING', 'RESOLVED', 'DISMISSED'
                             )),
  resolution               TEXT,
  resolved_by              UUID,
  resolved_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_tenant_status
  ON candidate_nomination_disputes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_election
  ON candidate_nomination_disputes(nomination_election_id);

COMMENT ON TABLE candidate_nomination_disputes IS
  'Dispute filings against nomination elections. Filed by party admins, resolved by super admin.';

-- ── 7. Column comments on candidate_elections ──────────────────────────
COMMENT ON COLUMN candidate_elections.position_code IS
  'Position: GOVERNOR, SENATOR, WOMEN_REP, MP, MCA. NULL for General Elections.';
COMMENT ON COLUMN candidate_elections.county_code IS
  'NEC county iebc_code for county-level nominations (Governor, Senator, Women Rep)';
COMMENT ON COLUMN candidate_elections.constituency_code IS
  'NEC constituency iebc_code for constituency-level nominations (MP)';
COMMENT ON COLUMN candidate_elections.ward_code IS
  'NEC ward iebc_code for ward-level nominations (MCA)';

COMMIT;

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('130_nomination_geographic_positions.sql', NOW())
ON CONFLICT DO NOTHING;
