// ============================================================
// VoteCapsule™ — On-Device SHA-256 Hashing
// apps/agent-mobile/src/utils/crypto.ts
//
// ██████████████████████████████████████████████████████████
// WARNING: SHA-256 FORMULA IS LOCKED — DO NOT MODIFY
//
// Formula: SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
//
// This exact formula is also implemented server-side in
// the Evidence Service. The server RE-COMPUTES the hash
// from the uploaded data and REJECTS the capsule if it
// does not match. Any deviation here = rejected submissions.
// ██████████████████████████████████████████████████████████
// ============================================================
import * as Crypto from 'expo-crypto';

export interface CapsuleMetadata {
  iebcStationCode: string;
  positionCode: string;
  electionYear: number;
  tenantId: string;
}

/**
 * Compute SHA-256 of a raw string (hex output, lowercase).
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return digest.toLowerCase();
}

/**
 * Compute SHA-256 of a Uint8Array image buffer.
 * Used to produce imageSHA256 before the composite hash.
 */
export async function sha256Bytes(data: Uint8Array): Promise<string> {
  // expo-crypto expects a base64 string for binary data
  const b64 = uint8ArrayToBase64(data);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    b64,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return digest.toLowerCase();
}

/**
 * ████ LOCKED FORMULA ████
 *
 * Compute the VoteCapsule composite evidence hash.
 *
 * Formula: SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
 *
 * @param imageSha256       - hex SHA-256 of the raw image bytes
 * @param metadata          - capsule metadata (keys sorted alphabetically before JSON serialisation)
 * @param captureTimestamp  - ISO 8601 UTC string, e.g. "2027-08-09T07:30:00.000Z"
 * @returns 64-char lowercase hex string
 */
export async function computeCapsuleHash(
  imageSha256: string,
  metadata: CapsuleMetadata,
  captureTimestamp: string,
): Promise<string> {
  // Keys MUST be sorted alphabetically — server uses same sort
  const sortedMetadataJSON = JSON.stringify(
    Object.fromEntries(
      Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );

  const payload = imageSha256 + sortedMetadataJSON + captureTimestamp;
  return sha256Hex(payload);
}

// ── Helpers ───────────────────────────────────────────────

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}
