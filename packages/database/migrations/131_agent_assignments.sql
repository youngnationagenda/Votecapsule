-- ============================================================
-- VoteCapsule™ — Migration 131
-- Agent Assignment Scoping + Geo-Fencing
--
-- Purpose: Store the scoped assignment linking an agent to a
-- specific election + set of polling stations. The mobile app
-- fetches this to restrict what the agent can see/capture.
--
-- Key design decisions:
--   - stations stored as JSONB for flexible structure (no extra join table)
--   - Unique constraint prevents duplicate ACTIVE assignments for same agent+election
--   - geofence_radius_meters configurable per assignment
--   - expires_at allows time-limited assignments
--
-- Generated: 2026-08-12 by Sonie
-- ============================================================

BEGIN;

-- ── 1. agent_assignments table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_assignments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Election scoping
  election_id             UUID NOT NULL,
  election_name           VARCHAR(255) NOT NULL,
  position_code           VARCHAR(20) NOT NULL,

  -- Geographic scope
  area_name               VARCHAR(255) NOT NULL,
  county_code             VARCHAR(10),
  constituency_code       VARCHAR(10),
  ward_code               VARCHAR(10),

  -- Assigned stations (JSONB array of station objects)
  -- Each element: { iebcCode, streamNumber, name, centreName, registeredVoters,
  --                 latitude, longitude, countyCode, countyName, constituencyCode,
  --                 constituencyName, wardCode, wardName }
  stations                JSONB NOT NULL DEFAULT '[]',

  -- Geo-fence settings
  geofence_radius_meters  INTEGER NOT NULL DEFAULT 500,

  -- Status
  status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'SUSPENDED', 'COMPLETED')),

  -- Metadata
  assigned_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate ACTIVE assignments for the same agent+election
  CONSTRAINT unique_active_assignment
    UNIQUE (agent_user_id, election_id, status)
);

-- ── 2. Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agent_assignments_tenant
  ON agent_assignments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent
  ON agent_assignments(agent_user_id);

CREATE INDEX IF NOT EXISTS idx_agent_assignments_election
  ON agent_assignments(election_id);

CREATE INDEX IF NOT EXISTS idx_agent_assignments_status
  ON agent_assignments(status)
  WHERE status = 'ACTIVE';

-- ── 3. Auto-update updated_at trigger ──────────────────────────────────
-- Only create trigger if the update_updated_at_column() function exists
-- (it was created in earlier migrations for other tables).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_agent_assignments_updated_at'
    ) THEN
      EXECUTE '
        CREATE TRIGGER trg_agent_assignments_updated_at
          BEFORE UPDATE ON agent_assignments
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      ';
    END IF;
  END IF;
END $$;

-- ── 4. Table + column comments ──────────────────────────────────────────
COMMENT ON TABLE agent_assignments IS
  'Scoped assignment linking an agent user to a specific election and set of polling stations. '
  'The mobile app fetches this to restrict capture scope and enforce geo-fencing.';

COMMENT ON COLUMN agent_assignments.stations IS
  'JSONB array of polling station objects with full NEC geographic context. '
  'Each: { iebcCode, streamNumber, name, centreName, registeredVoters, latitude, longitude, '
  'countyCode, countyName, constituencyCode, constituencyName, wardCode, wardName }';

COMMENT ON COLUMN agent_assignments.geofence_radius_meters IS
  'Soft geo-fence radius in metres. Captures beyond this radius trigger a warning. '
  'Captures beyond 4x this radius are rejected by the Evidence Service.';

COMMENT ON COLUMN agent_assignments.status IS
  'ACTIVE = agent currently assigned. SUSPENDED = temporarily blocked. COMPLETED = assignment ended.';

COMMIT;

-- Record migration
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('131_agent_assignments.sql', NOW())
ON CONFLICT DO NOTHING;
