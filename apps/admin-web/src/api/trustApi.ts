/**
 * Vote Capsule™ Admin Portal — Trust Service API Client
 * IMPORTANT: Never use "blockchain" — always say "Integrity Verified" / "Trust Ledger"
 *
 * Trust Service routes:
 *   POST /trust/anchor                    — queue a capsule hash
 *   GET  /trust/verify/:capsuleId         — verify by capsule UUID
 *   GET  /trust/verify-hash/:sha256Hash   — verify by SHA-256 hash
 *   GET  /trust/batch/:batchId            — single batch detail
 *   GET  /trust/proof/:capsuleId          — Merkle proof for a capsule
 *   GET  /trust/stats                     — aggregate stats object (NOT an array)
 */
import { trustClient } from './apiClient';

export interface VerificationResult {
  capsuleId: string;
  sha256Hash: string;
  found: boolean;
  hashMatch: boolean;
  verified?: boolean;
  anchoredAt: string | null;
  batchId?: string | null;
  merkleRoot?: string | null;
  merkleProof?: string[] | null;
  hedera: {
    transactionId: string | null;
    consensusTimestamp: string | null;
    topicId?: string | null;
    explorerUrl: string | null;
    network: string;
  } | null;
  rfc3161: {
    signingTime: string | null;
    tsaUrl: string | null;
    tokenPresent?: boolean;
    hasToken?: boolean;
  } | null;
  status?: string;
  verifiedAt: string;
}

/** Shape returned by GET /trust/stats */
export interface TrustStats {
  totalBatches: number;
  totalLeaves: number;
  dualAnchored: number;
  partialAnchored: number;
  pendingQueue: number;
  hederaNetwork: string;
  tsaUrl: string;
}

/** Shape returned by GET /trust/batch/:id */
export interface TrustAnchorBatch {
  id: string;
  merkleRoot: string;
  leafCount: number;
  treeDepth: number;
  hederaTransactionId: string | null;
  hederaConsensusTimestamp: string | null;
  hederaTopicId: string | null;
  hederaExplorerUrl: string | null;
  hederaNetwork: string;
  rfc3161SigningTime: string | null;
  rfc3161TsaUrl: string | null;
  status: string;
  batchedAt: string;
  anchoredAt: string | null;
}

export const trustApi = {
  verifyCapsule: async (capsuleId: string): Promise<VerificationResult> => {
    const { data } = await trustClient.get<VerificationResult>(`/verify/${capsuleId}`);
    return data;
  },

  verifyByHash: async (sha256Hash: string): Promise<VerificationResult> => {
    const { data } = await trustClient.get<VerificationResult>(`/verify-hash/${sha256Hash}`);
    return data;
  },

  /** GET /trust/stats — returns aggregate counts, NOT a batch array */
  getStats: async (): Promise<TrustStats> => {
    const { data } = await trustClient.get<TrustStats>('/stats');
    return data;
  },

  /** GET /trust/batch/:batchId — single batch detail */
  getBatch: async (batchId: string): Promise<TrustAnchorBatch> => {
    const { data } = await trustClient.get<TrustAnchorBatch>(`/batch/${batchId}`);
    return data;
  },

  getHistory: async (capsuleId: string) => {
    const { data } = await trustClient.get(`/verify/${capsuleId}`);
    return data;
  },
};
