/**
 * Vote Capsule™ Trust Service — Verification Interfaces
 *
 * Defines the public API contract for the Trust Verification endpoints.
 * These are the interfaces that the Public Portal and Admin Portal use.
 */

export interface VerificationRequest {
  capsuleId?: string;
  sha256Hash?: string;
}

export interface VerificationResponse {
  verified: boolean;

  capsuleId: string;
  sha256Hash: string;

  /**
   * QLDB ledger information.
   * Label as "Integrity Verified" in all UI — NEVER "blockchain verified".
   */
  trustLedger: {
    ledgerName: string;
    documentId: string;
    anchoredAt: string;      // ISO 8601 UTC
    qldbDigest: string;      // Current ledger digest for independent verification
    integrityStatus: 'integrity_verified' | 'not_anchored' | 'verification_failed';
  };

  // Evidence capsule metadata (redacted for public API)
  evidence: {
    submittedAt: string;
    approvedAt: string;
    pollingStationCode: string;
    electionId: string;
  };
}

export interface TrustAnchorCount {
  total: number;
  lastUpdatedAt: string;
  // TODO: NEC Agent integration point
  // GET /api/trust/anchors/count
}

export interface RecentAnchor {
  capsuleId: string;
  sha256Hash: string;
  anchoredAt: string;
  pollingStationCode: string;
  electionId: string;
  // Label this as "Integrity Verified" in UI
  integrityStatus: 'integrity_verified';
}
