/**
 * Vote Capsule™ Trust Service — SHA-256 Hash Utilities
 *
 * CRITICAL: This is the trust layer implementation.
 * We use Amazon QLDB + SHA-256 hashing. NOT blockchain, NOT Ethereum, NOT Hyperledger.
 *
 * Trust flow:
 * 1. Mobile agent captures photo → computes SHA-256(image_bytes + metadata + timestamp)
 * 2. Hash stored on device alongside image
 * 3. On sync: server recomputes hash, compares — mismatch = tampered = rejected
 * 4. Human validator approves capsule
 * 5. Hash + metadata written to QLDB → immutable, detects any future tampering
 * 6. Public Verification API: GET /trust/verify/{capsuleId} → SHA-256 + QLDB digest
 *
 * NEVER use the word "blockchain" in user-facing output.
 * Use "integrity verified", "trust verified", or "QLDB verified".
 */

import * as crypto from 'crypto';

export interface CapsuleHashInput {
  imageBytes: Buffer;
  metadataJson: string;
  captureTimestamp: string; // ISO 8601 UTC
}

export interface HashResult {
  sha256Hash: string;
  algorithm: 'SHA-256';
  computedAt: string; // ISO 8601 UTC
}

/**
 * Computes SHA-256 hash of an Evidence Capsule.
 * This is the canonical hash used for integrity verification.
 *
 * Input: image bytes + metadata JSON + capture timestamp
 * All three components MUST be present for a valid hash.
 */
export function computeCapsuleHash(input: CapsuleHashInput): HashResult {
  const hash = crypto.createHash('sha256');
  hash.update(input.imageBytes);
  hash.update(input.metadataJson);
  hash.update(input.captureTimestamp);

  return {
    sha256Hash: hash.digest('hex'),
    algorithm: 'SHA-256',
    computedAt: new Date().toISOString(),
  };
}

/**
 * Verifies that a received capsule hash matches what we would compute from the received data.
 * If hashes differ → the capsule was tampered with in transit → REJECT.
 */
export function verifyCapsuleHash(
  input: CapsuleHashInput,
  expectedHash: string,
): { verified: boolean; computedHash: string; expectedHash: string } {
  const { sha256Hash } = computeCapsuleHash(input);
  return {
    verified: sha256Hash === expectedHash,
    computedHash: sha256Hash,
    expectedHash,
  };
}

/**
 * Computes SHA-256 of arbitrary data.
 * Used for QLDB journal digest verification.
 */
export function computeSha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
