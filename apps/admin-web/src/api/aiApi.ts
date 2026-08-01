/**
 * Vote Capsule™ Admin Portal — AI Service API Client
 * AI ASSISTS, HUMANS DECIDE. Never display AI decisions as final.
 */
import { aiClient } from './apiClient';

export interface AiStats {
  total: number;
  breakdown: Array<{
    status: string;
    routingDecision: string | null;
    count: string;
  }>;
}

export interface AiVerificationJob {
  id: string;
  capsuleId: string;
  iebcStationCode: string;
  positionCode: string;
  electionYear: number;
  countyCode: string;
  status: string;
  overallConfidence: number | null;
  routingDecision: string | null;
  isFlagged: boolean;
  flagReasons: string[] | null;
  completedAt: string | null;
  createdAt: string;
}

export const aiApi = {
  getStats: async (countyCode?: string): Promise<AiStats> => {
    const { data } = await aiClient.get<AiStats>('/stats', {
      params: countyCode ? { countyCode } : {},
    });
    return data;
  },

  getFlaggedJobs: async (countyCode?: string): Promise<AiVerificationJob[]> => {
    const { data } = await aiClient.get<AiVerificationJob[]>('/jobs/flagged', {
      params: countyCode ? { countyCode } : {},
    });
    return data;
  },

  getJob: async (jobId: string): Promise<AiVerificationJob> => {
    const { data } = await aiClient.get<AiVerificationJob>(`/jobs/${jobId}`);
    return data;
  },

  getJobByCapsule: async (capsuleId: string): Promise<AiVerificationJob> => {
    const { data } = await aiClient.get<AiVerificationJob>(`/jobs/capsule/${capsuleId}`);
    return data;
  },
};
