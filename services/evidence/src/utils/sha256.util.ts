// ============================================================
// VoteCapsule — SHA-256 Hashing Utilities
// services/evidence/src/utils/sha256.util.ts
//
// CRITICAL: The same formula must be implemented identically
// on the mobile app (React Native) and server (Node.js).
// Any divergence = hash mismatch = submission rejected.
//
// Formula: SHA-256(image_bytes + metadata_json + capture_timestamp)
// ============================================================
import * as crypto from 'crypto';

export interface HashMetadata {
  iebcStationCode:  string;
  positionCode:     string;
  electionYear:     number;
  streamNumber:     number;
  captureTimestamp: string;   // ISO 8601 UTC e.g. "2027-08-09T06:00:00.000Z"
  agentDeviceId:    string;
  imageIndex:       number;
}

export interface CompositeHashInput {
  imageBytes:    Buffer;
  metadata:      HashMetadata;
}

export interface CompositeHashResult {
  hashValue:        string;           // 64-char hex SHA-256
  hashedComponents: {
    imageSha256:       string;        // hash of image alone (for reference)
    metadataJson:      string;        // exact JSON string hashed
    captureTimestamp:  string;        // the timestamp included
  };
}

/**
 * Compute the canonical VoteCapsule composite hash.
 *
 * Steps:
 * 1. Hash the image bytes alone → imageSha256
 * 2. Serialize metadata to canonical JSON (sorted keys, no whitespace)
 * 3. Concatenate: imageSha256 (hex string) + metadataJson + captureTimestamp
 * 4. SHA-256 the concatenated string → final hash
 *
 * This is the value stored in evidence_hashes.hash_value
 * and anchored to QLDB.
 */
export function computeCompositeHash(input: CompositeHashInput): CompositeHashResult {
  // Step 1: hash image bytes
  const imageSha256 = crypto
    .createHash('sha256')
    .update(input.imageBytes)
    .digest('hex');

  // Step 2: canonical metadata JSON (sorted keys, no whitespace)
  const metadataJson = JSON.stringify(input.metadata, Object.keys(input.metadata).sort());

  // Step 3: concatenate
  const composite = imageSha256 + metadataJson + input.metadata.captureTimestamp;

  // Step 4: final hash
  const hashValue = crypto
    .createHash('sha256')
    .update(composite, 'utf8')
    .digest('hex');

  return {
    hashValue,
    hashedComponents: {
      imageSha256,
      metadataJson,
      captureTimestamp: input.metadata.captureTimestamp,
    },
  };
}

/**
 * Verify a hash received from the device.
 * Returns true if server-computed hash matches device-submitted hash.
 * Returns false if tampered in transit.
 */
export function verifyCompositeHash(
  input: CompositeHashInput,
  submittedHash: string,
): boolean {
  const { hashValue } = computeCompositeHash(input);
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hashValue.toLowerCase(), 'hex'),
      Buffer.from(submittedHash.toLowerCase(), 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 of raw bytes only (for image-level hashing).
 */
export function hashBytes(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-256 of a string (for metadata hashing).
 */
export function hashString(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}
