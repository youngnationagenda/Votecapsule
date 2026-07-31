/**
 * Vote Capsule™ Admin Portal — Geography API Client
 *
 * Wraps all 18 Geography Service endpoints.
 * Geography Service is the single source of truth for all Kenya election geography.
 * NEVER hardcode geographic data — always call this API.
 */

import axios from 'axios';

const geographyClient = axios.create({
  baseURL: import.meta.env['VITE_GEOGRAPHY_API_URL'] ?? '/api/geography',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

geographyClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface GeographyStats {
  counties: number;
  constituencies: number;
  wards: number;
  registrationCentres: number;
  pollingStations: number;
  totalRegisteredVoters: number;
  electionYear: number;
}

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

export interface PollingStationValidation {
  id: number;
  iebcStationCode: string;
  streamNumber: number;
  name: string;
  registeredVoters: number;
  centreName: string;
  wardName: string;
  wardCode: string;
  constituencyName: string;
  constituencyCode: string;
  countyName: string;
  countyCode: string;
  latitude: number | null;
  longitude: number | null;
  stationType: string;
  active: boolean;
  electionYear: number;
}

export const geographyApi = {
  getStats: async (): Promise<GeographyStats> => {
    const { data } = await geographyClient.get<GeographyStats>('/stats');
    return data;
  },

  getCounties: async (includeSpecial = false): Promise<County[]> => {
    const { data } = await geographyClient.get<County[]>('/counties', {
      params: includeSpecial ? { includeSpecial: 'true' } : {},
    });
    return data;
  },

  getCounty: async (code: string): Promise<County> => {
    const { data } = await geographyClient.get<County>(`/counties/${code}`);
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

  validateStation: async (code: string): Promise<PollingStationValidation> => {
    const { data } = await geographyClient.get<PollingStationValidation>(
      `/polling-stations/${code}/validate`,
    );
    return data;
  },

  searchStations: async (query: string, limit = 20) => {
    const { data } = await geographyClient.get('/polling-stations/search', {
      params: { q: query, limit },
    });
    return data;
  },

  getTotalRegisteredVoters: async (): Promise<{ total: number }> => {
    const { data } = await geographyClient.get<{ total: number }>('/registered-voters');
    return data;
  },

  getVotersByCounty: async () => {
    const { data } = await geographyClient.get('/registered-voters/by-county');
    return data;
  },
};
