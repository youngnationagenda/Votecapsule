/**
 * Vote Capsule™ Admin Portal — Trust Service API Client
 *
 * Wraps Trust Service endpoints for the Trust Ledger Monitor page.
 *
 * IMPORTANT: Never use the word "blockchain" in any label.
 * Always say "Integrity Verified", "Trust Ledger", or "QLDB".
 */

import axios from 'axios';

const trustClient = axios.create({
  baseURL: import.meta.env['VITE_TRUST_API_URL'] ?? '/api/trust',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

trustClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface VerificationResult {
  capsuleId: string;
  sha256Hash: string;
  found: boolean;
  hashMatch: boolean;
  anchoredAt: string | null;
  qldbDocumentId: string | null;
  qldbConfirmed: boolean;
  verifiedAt: string;
}

export interface LedgerDigest {
  ledger: string;
  digest: string | null;
  at: string;
}

export interface TrustAnchor {
  id: string;
  capsuleId: string;
  sha256Hash: string;
  qldbDocumentId: string;
  qldbAnchoredAt: string;
  qldbDigest: string | null;
  status: string;
  verificationCount: number;
  lastVerifiedAt: string | null;
  createdAt: string;
}

export const trustApi = {
  /**
   * Verify a capsule by ID — returns integrity verification result.
   * Labels result as "Integrity Verified" — never "blockchain verified".
   */
  verifyCapsule: async (capsuleId: string): Promise<VerificationResult> => {
    const { data } = await trustClient.get<VerificationResult>(`/verify/${capsuleId}`);
    return data;
  },

  /**
   * Verify by SHA-256 hash — for public verification without capsule ID.
   */
  verifyByHash: async (sha256Hash: string): Promise<VerificationResult> => {
    const { data } = await trustClient.get<VerificationResult>(`/verify-hash/${sha256Hash}`);
    return data;
  },

  /**
   * Get current QLDB ledger digest for independent integrity verification.
   * Displayed on the Trust Ledger Monitor page.
   */
  getLedgerDigest: async (): Promise<LedgerDigest> => {
    const { data } = await trustClient.get<LedgerDigest>('/digest');
    return data;
  },

  /**
   * Get history for a specific capsule (QLDB journal revisions).
   */
  getHistory: async (capsuleId: string) => {
    const { data } = await trustClient.get(`/history/${capsuleId}`);
    return data;
  },
};
