/**
 * Vote Capsule™ Trust Service — QLDB Client Wrapper
 *
 * STUB — QLDB integration is deferred until the Evidence Capsule service is ready.
 * The ledger is provisioned by the CDK stack (VoteCapsuleQldbStack).
 * This client wraps Amazon QLDB for trust anchor creation and verification.
 *
 * ARCHITECTURE QUESTION: Coordinate with NEC Agent before implementing trust anchors.
 * Reference: Sonie.md — Coordination Points
 * Temporary solution: Interface defined, implementation stubbed.
 */

export interface TrustAnchorRecord {
  capsuleId: string;
  sha256Hash: string;
  tenantId: string;
  electionId: string;
  pollingStationCode: string;
  anchoredBy: string;  // User ID of the approving validator
  anchoredAt: string;  // ISO 8601 UTC
  metadata: Record<string, unknown>;
}

export interface QldbVerificationResult {
  verified: boolean;
  capsuleId: string;
  sha256Hash: string;
  qldbDigest: string;  // Current QLDB ledger digest
  anchoredAt: string;
  ledgerName: string;
}

/**
 * STUB: Creates a trust anchor in QLDB for an approved Evidence Capsule.
 *
 * TODO: Trust Service integration
 * Implement using @aws-sdk/client-qldb-session once Evidence Service is ready.
 * Ledger name: 'vote-capsule-trust' (provisioned by VoteCapsuleQldbStack CDK)
 */
export async function createTrustAnchor(
  _record: TrustAnchorRecord,
): Promise<{ documentId: string; ledgerName: string }> {
  // STUB — Not yet implemented
  // TODO: Implement QLDB document insertion via Amazon QLDB Driver
  throw new Error('STUB: QLDB trust anchor creation not yet implemented. Awaiting Evidence Service coordination.');
}

/**
 * STUB: Verifies a trust anchor exists in QLDB for a given capsule.
 *
 * TODO: Trust Service integration
 * Public Verification API: GET /trust/verify/{capsuleId}
 */
export async function verifyTrustAnchor(
  _capsuleId: string,
): Promise<QldbVerificationResult> {
  // STUB — Not yet implemented
  throw new Error('STUB: QLDB trust anchor verification not yet implemented.');
}

/**
 * STUB: Returns the current QLDB ledger digest.
 * Used on the Trust Ledger Monitor page.
 */
export async function getLedgerDigest(_ledgerName: string): Promise<string> {
  // STUB — Not yet implemented
  throw new Error('STUB: QLDB digest retrieval not yet implemented.');
}
