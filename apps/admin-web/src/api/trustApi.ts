/**
 * Vote Capsule™ Admin Portal — Trust Service API Client
 * IMPORTANT: Never use "blockchain" — always say "Integrity Verified" / "Trust Ledger"
 */
import { trustClient } from './apiClient';

export interface VerificationResult {
  capsuleId: string;
  sha256Hash: string;
  found: boolean;
  hashMatch: boolean;
  verified: boolean;
  anchoredAt: string | null;
  hedera: {
    transactionId: string | null;
    consensusTimestamp: string | null;
    topicId: string | null;
    explorerUrl: string | null;
    network: string;
  } | null;
  rfc3161: {
    signingTime: string | null;
    tsaUrl: string | null;
    tokenPresent: boolean;
  } | null;
  merkleProof: string[] | null;
  verifiedAt: string;
}

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

  getBatches: async (): Promise<TrustAnchorBatch[]> => {
    const { data } = await trustClient.get<TrustAnchorBatch[]>('/batches');
    return data;
  },

  getHistory: async (capsuleId: string) => {
    const { data } = await trustClient.get(`/history/${capsuleId}`);
    return data;
  },
};
