// ============================================================
// DEPRECATED — VoteCapsule QLDB Anchor DTO
//
// QLDB was removed from VoteCapsule (AWS deprecated QLDB, EOL 2024).
// The Trust Service now uses the Hybrid Anchor:
//   Hedera Consensus Service (Testnet) + RFC 3161 TSA (FreeTSA.org)
//
// This file is kept as a tombstone to prevent accidental re-introduction.
// Use: src/dto/anchor-callback.dto.ts  (AnchorCallbackDto)
// ============================================================

/** @deprecated Use AnchorCallbackDto from anchor-callback.dto.ts */
export class QldbAnchorDto {}
