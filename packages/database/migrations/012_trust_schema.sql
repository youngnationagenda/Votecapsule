-- ============================================================
-- VoteCapsule — Trust Service Database Schema
-- migration: 001_trust_schema.sql
--
-- Stores records of every QLDB anchor operation.
-- The QLDB journal is the authoritative trust record.
-- This PostgreSQL table is an operational index for fast lookups.
-- ============================================================

-- Tracks every QLDB anchor operation
CREATE TABLE IF NOT EXISTS trust_anchors (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Evidence reference
  capsule_id          UUID        NOT NULL,                  -- FK to evidence_capsules (cross-service)
  sha256_hash         CHAR(64)    NOT NULL,                  -- The composite hash being anchored

  -- QLDB record
  qldb_ledger_name    VARCHAR(100) NOT NULL DEFAULT 'vote-capsule-trust',
  qldb_document_id    VARCHAR(255) NOT NULL,                 -- QLDB-assigned document ID
  qldb_table_name     VARCHAR(100) NOT NULL DEFAULT 'TrustAnchors',
  qldb_sequence_no    VARCHAR(100) NOT NULL,                 -- QLDB sequence number (block address)
  qldb_anchored_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional QLDB digest snapshot at anchor time (for offline verification)
  qldb_digest         TEXT,                                  -- Base64-encoded SHA-256 digest

  -- Status
  status              VARCHAR(30)  NOT NULL DEFAULT 'ANCHORED',
                                                             -- ANCHORED | VERIFIED | FAILED | REVOKED

  -- Anchor request metadata
  requested_by_service VARCHAR(100) NOT NULL,                -- Which service requested the anchor
  requested_by_user    UUID,                                 -- Validator who approved (if applicable)
  request_payload     JSONB,                                 -- Full anchor request for audit

  -- Verification tracking
  last_verified_at    TIMESTAMPTZ,
  verification_count  INTEGER     NOT NULL DEFAULT 0,
  last_verify_result  BOOLEAN,                               -- TRUE = hash matches, FALSE = tampered

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique: one anchor per capsule per hash (re-anchor on correction would be new record)
CREATE UNIQUE INDEX IF NOT EXISTS ux_trust_anchors_capsule_hash
  ON trust_anchors (capsule_id, sha256_hash);

CREATE INDEX IF NOT EXISTS ix_trust_anchors_capsule_id
  ON trust_anchors (capsule_id);

CREATE INDEX IF NOT EXISTS ix_trust_anchors_sha256
  ON trust_anchors (sha256_hash);

CREATE INDEX IF NOT EXISTS ix_trust_anchors_qldb_doc
  ON trust_anchors (qldb_document_id);

CREATE INDEX IF NOT EXISTS ix_trust_anchors_status
  ON trust_anchors (status);

-- Verification request log
-- Every call to GET /trust/verify/:capsuleId is recorded here
CREATE TABLE IF NOT EXISTS trust_verifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_id       UUID        NOT NULL REFERENCES trust_anchors(id),
  capsule_id      UUID        NOT NULL,
  sha256_hash     CHAR(64)    NOT NULL,

  -- Who requested
  requester_type  VARCHAR(50) NOT NULL,          -- SERVICE | USER | PUBLIC | AUDIT
  requester_id    VARCHAR(255),                   -- User UUID or service name

  -- Verification result
  hash_match      BOOLEAN     NOT NULL,
  qldb_confirmed  BOOLEAN     NOT NULL,           -- Was QLDB digest checked?
  qldb_digest     TEXT,                           -- QLDB digest at verification time

  -- Timing
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms     INTEGER                          -- How long the verification took
);

CREATE INDEX IF NOT EXISTS ix_trust_verifications_anchor
  ON trust_verifications (anchor_id);

CREATE INDEX IF NOT EXISTS ix_trust_verifications_capsule
  ON trust_verifications (capsule_id);

-- ============================================================
-- End of trust schema
-- ============================================================
