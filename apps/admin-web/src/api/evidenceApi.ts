/**
 * Vote Capsule™ Admin Portal — Evidence Capsule API Client
 */
import { evidenceClient } from './apiClient';

export interface EvidenceCapsule {
  id: string;
  tenantId: string;
  electionYear: number;
  positionCode: string;
  positionLevel: string;
  iebcStationCode: string;
  pollingStationName: string;
  wardCode: string;
  wardName: string;
  constituencyCode: string;
  constituencyName: string;
  countyCode: string;
  countyName: string;
  streamNumber: number;
  registeredVoters: number;
  agentUserId: string;
  capturedAt: string;
  submittedAt: string | null;
  status: string;
  sha256Hash: string | null;
  trustAnchorBatchId: string | null;
  anchorStatus: string | null;
  anchoredAt: string | null;
  aiConfidenceScore: number | null;
  aiFlagged: boolean;
  validatedBy: string | null;
  validatedAt: string | null;
  validationDecision: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface ChainOfCustodyEvent {
  id: string;
  capsuleId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  actorUserId: string | null;
  actorService: string | null;
  eventData: Record<string, unknown> | null;
  eventTimestamp: string;
}

export interface EvidenceStats {
  DRAFT?: number;
  CAPTURED?: number;
  UPLOADED?: number;
  AI_PROCESSING?: number;
  AI_VERIFIED?: number;
  PENDING_VALIDATION?: number;
  APPROVED?: number;
  REJECTED?: number;
  ANCHORED?: number;
  PUBLISHED?: number;
  ARCHIVED?: number;
}

export const evidenceApi = {
  getCapsule: async (id: string): Promise<EvidenceCapsule> => {
    const { data } = await evidenceClient.get<EvidenceCapsule>(`/capsules/${id}`);
    return data;
  },

  getCapsules: async (params?: Record<string, unknown>): Promise<EvidenceCapsule[]> => {
    const { data } = await evidenceClient.get<EvidenceCapsule[]>('/capsules', { params });
    return data;
  },

  getChainOfCustody: async (capsuleId: string): Promise<ChainOfCustodyEvent[]> => {
    const { data } = await evidenceClient.get<ChainOfCustodyEvent[]>(
      `/capsules/${capsuleId}/chain-of-custody`,
    );
    return data;
  },

  getCapsulesByCounty: async (countyCode: string, status?: string): Promise<EvidenceCapsule[]> => {
    const params: Record<string, string> = { countyCode };
    if (status) params.status = status;
    const { data } = await evidenceClient.get<EvidenceCapsule[]>('/capsules', { params });
    return data;
  },

  getStats: async (tenantId?: string): Promise<EvidenceStats> => {
    const { data } = await evidenceClient.get<EvidenceStats>('/stats', {
      params: tenantId ? { tenantId } : {},
    });
    return data;
  },
};
