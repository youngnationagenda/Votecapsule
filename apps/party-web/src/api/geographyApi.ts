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
  constituencyCount: number;
  wardCount: number;
  pollingStationCount: number;
  isSpecial: boolean;
  active: boolean;
}

export interface Constituency {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
  wardCount: number;
  pollingStationCount: number;
  countyId?: number;
  countyCode?: string;
  countyName?: string;
}

export interface Ward {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
  pollingStationCount: number;
  registrationCentreCount: number;
  constituencyId?: number;
  constituencyCode?: string;
  constituencyName?: string;
  countyCode?: string;
  countyName?: string;
}

// ── API Methods ──────────────────────────────────────────────

export const geographyApi = {
  // Raw lists (for dropdowns)
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

  // Rich summary endpoints with counts (from migration 172)
  getCountySummaries: async (): Promise<County[]> => {
    const { data } = await apiClient.get<County[]>('/geography/counties/summary');
    return data;
  },

  getConstituencySummaries: async (countyCode?: string): Promise<Constituency[]> => {
    const { data } = await apiClient.get<Constituency[]>('/geography/constituencies/summary', {
      params: countyCode ? { countyCode } : {},
    });
    return data;
  },

  getWardSummaries: async (constituencyCode?: string, countyCode?: string): Promise<Ward[]> => {
    const params: any = {};
    if (constituencyCode) params.constituencyCode = constituencyCode;
    if (countyCode) params.countyCode = countyCode;
    const { data } = await apiClient.get<Ward[]>('/geography/wards/summary', { params });
    return data;
  },
};
