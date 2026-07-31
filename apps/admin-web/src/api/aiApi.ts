/**
 * Vote Capsule™ Admin Portal — AI Service API Client
 *
 * AI ASSISTS, HUMANS DECIDE.
 * Never display AI decisions as final — always as advisory.
 */

import axios from 'axios';

const aiClient = axios.create({
  baseURL: import.meta.env['VITE_AI_API_URL'] ?? '/api/ai',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

aiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
