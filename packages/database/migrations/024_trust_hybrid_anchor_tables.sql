-- ============================================================
-- VoteCapsule — Migration 024: Trust Hybrid Anchor Tables
-- migration: 024_trust_hybrid_anchor_tables.sql
--
-- Creates the missing trust_anchor_batches and trust_anchor_leaves
-- tables that the Trust Service requires for Hedera + RFC 3161 anchoring.
--
-- Context: Migration 012 ran with an older version of trust_schema.sql
-- that only created trust_anchors + trust_verifications (QLDB-era schema).
-- The Trust Service was later migrated to Hybrid Anchor, adding
-- trust_anchor_batches and trust_anchor_leaves entities, but the DB
-- tables were never created. This migration adds them.
--
-- Safe to run: uses CREATE TABLE IF NOT EXISTS throughout.
-- ============================================================

BEGIN;

-- ── trust_anchor_batches ──────────────────────────────────────────────────────
-- One record per 60-second Merkle batch.
-- Holds the dual-anchor references: Hedera transaction + RFC 3161 token.
CREATE TABLE IF NOT EXISTS trust_anchor_batches (
  id                            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Merkle tree
  merkle_root                   CHAR(64)     NOT NULL,
  leaf_count                    INTEGER      NOT NULL,
  tree_depth                    INTEGER      NOT NULL,

  -- Hedera Consensus Service anchor
  hedera_transaction_id         VARCHAR(255),
  hedera_consensus_timestamp    VARCHAR(100),
  hedera_topic_id               VARCHAR(50),
  hedera_topic_sequence_number  BIGINT,
  hedera_explorer_url           VARCHAR(500),
  hedera_network                VARCHAR(20)  NOT NULL DEFAULT 'testnet',

  -- RFC 3161 Timestamp Authority anchor
  rfc3161_token                 TEXT,
  rfc3161_tsa_url               VARCHAR(500),
  rfc3161_signing_time          TIMESTAMPTZ,

  -- Status: PENDING | HEDERA_ONLY | TSA_ONLY | DUAL_ANCHORED | FAILED
  status                        VARCHAR(30)  NOT NULL DEFAULT 'PENDING',

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
-- One record per Evidence Capsule anchored.
-- Links each capsule's SHA-256 hash back to its Merkle batch.
-- Stores the Merkle proof path for independent per-capsule verification.
CREATE TABLE IF NOT EXISTS trust_anchor_leaves (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Evidence reference (no FK across service boundaries)
  capsule_id            UUID        NOT NULL UNIQUE,
  sha256_hash           CHAR(64)    NOT NULL,

  -- Batch reference
  batch_id              UUID        NOT NULL REFERENCES trust_anchor_batches(id),
  leaf_index            INTEGER     NOT NULL,
  merkle_proof          JSONB       NOT NULL,

  -- Metadata
  anchored_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by_service  VARCHAR(100) NOT NULL DEFAULT 'evidence-service',
  requested_by_user     UUID,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_leaves_capsule_id
  ON trust_anchor_leaves (capsule_id);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_leaves_sha256
  ON trust_anchor_leaves (sha256_hash);

CREATE INDEX IF NOT EXISTS ix_trust_anchor_leaves_batch_id
  ON trust_anchor_leaves (batch_id);

COMMIT;

-- ============================================================
-- End of migration 024 (Trust Hybrid Anchor Tables)
-- ============================================================
