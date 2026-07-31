// ============================================================
// DEPRECATED — VoteCapsule Trust Service QLDB Client
//
// QLDB was removed from VoteCapsule (AWS deprecated QLDB, EOL 2024).
// Trust anchoring now uses the Hybrid Anchor:
//   Hedera Consensus Service (Testnet) — src/hedera/hedera.client.ts
//   RFC 3161 TSA (FreeTSA.org)         — src/tsa/rfc3161.client.ts
//
// This file is kept as a tombstone to prevent accidental re-introduction.
// ============================================================

/** @deprecated Use HederaClientService from src/hedera/hedera.client.ts */
export interface TrustAnchorRecord {}

/** @deprecated Replaced by Hybrid Anchor verification */
export interface QldbVerificationResult {}
