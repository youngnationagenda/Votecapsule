/**
 * Vote Capsule™ Party Portal — Geography API Client (NEC Database)
 *
 * Uses the shared apiClient (with JWT inject + token-refresh interceptors).
 * Geography Service routes through API Gateway at /geography/...
 */
import { apiClient } from './apiClient';

// ── Types ────────────────────────────────────────────────────

export interface County {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
  isSpecial: boolean;
  active: boolean;
}

export interface Constituency {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
  countyId: number;
}

export interface Ward {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
  constituencyId: number;
}

// ── API Methods ──────────────────────────────────────────────

export const geographyApi = {
  getCounties: async (includeSpecial = false): Promise<County[]> => {
    const { data } = await apiClient.get<County[]>('/geography/counties', {
      params: includeSpecial ? { includeSpecial: 'true' } : {},
    });
    return data;
  },

  getConstituencies: async (countyCode?: string): Promise<Constituency[]> => {
    const { data } = await apiClient.get<Constituency[]>('/geography/constituencies', {
      params: countyCode ? { countyCode } : {},
    });
    return data;
  },

  getWards: async (constituencyCode?: string): Promise<Ward[]> => {
    const { data } = await apiClient.get<Ward[]>('/geography/wards', {
      params: constituencyCode ? { constituencyCode } : {},
    });
    return data;
  },
};
