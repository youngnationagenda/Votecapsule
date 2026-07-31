-- ============================================================
-- VoteCapsule — Trust Service Database Schema (Hybrid Anchor)
-- migration: 012_trust_schema.sql
--
-- Replaces the previous QLDB-based trust_anchors table.
-- The trust layer now uses a Hybrid Anchor:
--   1. Hedera Consensus Service (Testnet) — public blockchain proof
--   2. RFC 3161 Timestamp Authority (FreeTSA.org) — legal timestamp proof
--
-- Architecture:
--   trust_anchor_batches — one record per 60-second Merkle batch
--   trust_anchor_leaves  — one record per Evidence Capsule (links to batch)
--   trust_verifications  — log of every /trust/verify call
--
-- Verification flow:
--   leaf.sha256_hash + leaf.merkle_proof → recomputes to batch.merkle_root
--   batch.merkle_root confirmed on Hedera + RFC 3161 simultaneously
-- ============================================================

-- Drop old QLDB tables if they exist (safe — migration runner checks)
DROP TABLE IF EXISTS trust_verifications CASCADE;
DROP TABLE IF EXISTS trust_anchors CASCADE;

-- ── trust_anchor_batches ──────────────────────────────────────────────────────
-- One record per 60-second Merkle batch.
-- Holds the dual-anchor references: Hedera transaction + RFC 3161 token.
CREATE TABLE IF NOT EXISTS trust_anchor_batches (
  id                            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Merkle tree
  merkle_root                   CHAR(64)     NOT NULL,    -- SHA-256 root of the batch
  leaf_count                    INTEGER      NOT NULL,    -- How many capsules in this batch
  tree_depth                    INTEGER      NOT NULL,    -- Depth of the Merkle tree

  -- Hedera Consensus Service anchor
  hedera_transaction_id         VARCHAR(255),             -- e.g. 0.0.12345@1693000000.000000000
  hedera_consensus_timestamp    VARCHAR(100),             -- e.g. 2027-08-09T14:30:00.123456789Z
  hedera_topic_id               VARCHAR(50),              -- HCS topic ID
  hedera_topic_sequence_number  BIGINT,                   -- Sequence number within topic
  hedera_explorer_url           VARCHAR(500),             -- HashScan link for public verification
  hedera_network                VARCHAR(20)  NOT NULL DEFAULT 'testnet',

  -- RFC 3161 Timestamp Authority anchor
  rfc3161_token                 TEXT,                     -- Base64-encoded CMS SignedData
  rfc3161_tsa_url               VARCHAR(500),             -- Which TSA was used
  rfc3161_signing_time          TIMESTAMPTZ,              -- Signing time from TSA response

  -- Status
  status                        VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
                                                          -- PENDING | HEDERA_ONLY | TSA_ONLY | DUAL_ANCHORED | FAILED

  batched_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  anchored_at                   TIMESTAMPTZ,
  retry_count                   INTEGER      NOT NULL DEFAULT 0,
  error_message                 TEXT,

  created_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_batches_merkle_root
  ON trust_anchor_batches (merkle_root);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_batches_hedera_tx
  ON trust_anchor_batches (hedera_transaction_id);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_batches_status
  ON trust_anchor_batches (status);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_batches_batched_at
  ON trust_anchor_batches (batched_at);


-- ── trust_anchor_leaves ───────────────────────────────────────────────────────
-- One record per Evidence Capsule.
-- Links each capsule's SHA-256 hash back to its Merkle batch.
-- Stores the proof path so any individual capsule can be independently verified.
CREATE TABLE IF NOT EXISTS trust_anchor_leaves (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Evidence reference (cross-service — no FK across service boundaries)
  capsule_id            UUID        NOT NULL UNIQUE,       -- FK to evidence_capsules
  sha256_hash           CHAR(64)    NOT NULL,

  -- Batch reference
  batch_id              UUID        NOT NULL REFERENCES trust_anchor_batches(id),
  leaf_index            INTEGER     NOT NULL,              -- Position in the Merkle tree (0-based)
  merkle_proof          JSONB       NOT NULL,              -- Array of sibling hashes: leaf → root

  -- Metadata
  anchored_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by_service  VARCHAR(100) NOT NULL DEFAULT 'evidence-service',
  requested_by_user     UUID,                              -- Validator UUID if applicable

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_leaves_capsule_id
  ON trust_anchor_leaves (capsule_id);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_leaves_sha256
  ON trust_anchor_leaves (sha256_hash);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_leaves_batch_id
  ON trust_anchor_leaves (batch_id);


-- ── trust_verifications ───────────────────────────────────────────────────────
-- Logs every call to GET /trust/verify/:capsuleId or /trust/verify-hash/:hash.
CREATE TABLE IF NOT EXISTS trust_verifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id      UUID        NOT NULL,
  sha256_hash     CHAR(64)    NOT NULL,

  -- Who requested
  requester_type  VARCHAR(50) NOT NULL,     -- SERVICE | USER | PUBLIC | AUDIT
  requester_id    VARCHAR(255),              -- User UUID or service name

  -- Verification result
  hash_match      BOOLEAN     NOT NULL,     -- Merkle proof recomputes to root
  verified        BOOLEAN     NOT NULL DEFAULT FALSE,  -- hash_match AND DUAL_ANCHORED

  -- Timing
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS ix_trust_verifications_capsule
  ON trust_verifications (capsule_id);

CREATE INDEX IF NOT EXISTS ix_trust_verifications_sha256
  ON trust_verifications (sha256_hash);


-- ============================================================
-- End of trust schema (Hybrid Anchor — 2026-07-31)
-- ============================================================
