-- ============================================================
-- VoteCapsule — Migration 018: Evidence Schema — Hybrid Anchor
-- migration: 018_evidence_hybrid_anchor.sql
--
-- Replaces QLDB columns in evidence_capsules and evidence_hashes
-- with Hybrid Anchor columns (Hedera + RFC 3161).
--
-- This migration is safe to run on an existing DB:
--   - evidence_capsules.qldb_document_id → trust_anchor_batch_id + anchor_status + anchored_at
--   - evidence_hashes.qldb_document_id   → trust_anchor_batch_id + anchor_status + anchored_at
--   - evidence_chain_of_custody: QLDB_ANCHORED enum value → TRUST_ANCHORED
--
-- All existing QLDB columns are NULL (QLDB was never production-live),
-- so this is a safe rename/replace operation.
--
-- Run AFTER: 012_trust_schema.sql  (trust_anchor_batches must exist first)
-- ============================================================

BEGIN;

-- ── evidence_capsules: replace QLDB columns ───────────────────────────────────

ALTER TABLE evidence_capsules
  DROP   COLUMN IF EXISTS qldb_document_id,
  DROP   COLUMN IF EXISTS qldb_anchored_at;

ALTER TABLE evidence_capsules
  ADD COLUMN IF NOT EXISTS trust_anchor_batch_id  UUID,
  ADD COLUMN IF NOT EXISTS anchor_status          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS anchored_at            TIMESTAMPTZ;

-- Replace the old QLDB index
DROP INDEX IF EXISTS idx_ec_qldb;
CREATE INDEX IF NOT EXISTS idx_ec_trust_batch ON evidence_capsules(trust_anchor_batch_id);
CREATE INDEX IF NOT EXISTS idx_ec_anchor_status ON evidence_capsules(anchor_status);


-- ── evidence_hashes: replace QLDB columns ────────────────────────────────────

ALTER TABLE evidence_hashes
  DROP   COLUMN IF EXISTS qldb_document_id,
  DROP   COLUMN IF EXISTS qldb_anchored_at,
  DROP   COLUMN IF EXISTS qldb_sequence_no;

ALTER TABLE evidence_hashes
  ADD COLUMN IF NOT EXISTS trust_anchor_batch_id  UUID,
  ADD COLUMN IF NOT EXISTS anchor_status          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS anchored_at            TIMESTAMPTZ;

-- Replace the old QLDB index
DROP INDEX IF EXISTS idx_eh_qldb;
CREATE INDEX IF NOT EXISTS idx_eh_trust_batch ON evidence_hashes(trust_anchor_batch_id);


-- ── evidence_chain_of_custody: rename event type ──────────────────────────────
-- Safe UPDATE — the column is varchar(50) not a native enum in Aurora.
-- Any QLDB_ANCHORED events can't exist (QLDB was never live), but run anyway.

UPDATE evidence_chain_of_custody
  SET event_type = 'TRUST_ANCHORED'
WHERE event_type = 'QLDB_ANCHORED';


COMMIT;

-- ============================================================
-- End of migration 018 (Hybrid Anchor — Evidence schema)
-- ============================================================
