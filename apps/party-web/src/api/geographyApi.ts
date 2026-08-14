/**
 * Vote Capsule™ Party Portal — Geography API Client (NEC Database)
 *
 * Mirrors admin-web geographyApi but uses the party-web apiClient.
 * Geography Service runs on :3005 — routed through API Gateway at /geography/...
 */
import axios from 'axios';
import { store } from '../store';

const GEO_BASE = import.meta.env.VITE_GEOGRAPHY_API_URL ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1/geography';

export const geographyClient = axios.create({
  baseURL: GEO_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

geographyClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
    const { data } = await geographyClient.get<County[]>('/counties', {
      params: includeSpecial ? { includeSpecial: 'true' } : {},
    });
    return data;
  },

  getConstituencies: async (countyCode?: string): Promise<Constituency[]> => {
    const { data } = await geographyClient.get<Constituency[]>('/constituencies', {
      params: countyCode ? { countyCode } : {},
    });
    return data;
  },

  getWards: async (constituencyCode?: string): Promise<Ward[]> => {
    const { data } = await geographyClient.get<Ward[]>('/wards', {
      params: constituencyCode ? { constituencyCode } : {},
    });
    return data;
  },
};
