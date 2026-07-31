// ============================================================
// DEPRECATED — VoteCapsule Trust Anchor Entity (QLDB)
//
// QLDB was removed from VoteCapsule (AWS deprecated QLDB, EOL 2024).
// The old trust_anchors table has been replaced by the Hybrid Anchor schema:
//   trust_anchor_batches  — one record per 60-second Merkle batch
//   trust_anchor_leaves   — one record per Evidence Capsule
//
// Active entities:
//   src/entities/trust-anchor-batch.entity.ts
//   src/entities/trust-anchor-leaf.entity.ts
//   src/entities/trust-verification.entity.ts
//
// This file is kept as a tombstone to prevent accidental re-introduction.
// ============================================================

/** @deprecated Use TrustAnchorBatch / TrustAnchorLeaf instead */
export class TrustAnchor {}

/** @deprecated AnchorStatus moved to BatchAnchorStatus in trust-anchor-batch.entity.ts */
export enum AnchorStatus {
  ANCHORED = 'ANCHORED',
  VERIFIED = 'VERIFIED',
  FAILED   = 'FAILED',
}
