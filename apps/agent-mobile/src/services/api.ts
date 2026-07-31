// ============================================================
// VoteCapsule™ — API Client
// apps/agent-mobile/src/services/api.ts
//
// Axios instance for all server calls.
// - Injects Cognito JWT (access token) on every request
// - Handles 401 → token refresh → retry once
// - All capsule submissions go via API Gateway → Evidence Service
// ============================================================
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getAuthTokens, saveAuthTokens, clearAuthTokens, getAgentUser } from '../utils/storage';
import { AuthTokens } from '../types';
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiGatewayUrl ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

const ELECTION_SERVICE_URL =
  Constants.expoConfig?.extra?.electionServiceUrl ??
  `${API_BASE_URL}`;

// ── Axios instance ────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — inject Bearer token ─────────────────

api.interceptors.request.use(async (config) => {
  const tokens = await getAuthTokens();
  if (tokens?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }
  const user = await getAgentUser();
  if (user) {
    config.headers = config.headers ?? {};
    config.headers['X-Agent-User-Id'] = user.userId;
    config.headers['X-Device-Id']     = user.deviceId;
    config.headers['X-Tenant-Id']     = user.tenantId;
  }
  return config;
});

// ── Response interceptor — 401 → refresh → retry ─────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` };
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const tokens = await getAuthTokens();
        if (!tokens?.refreshToken) throw new Error('No refresh token');
        const newTokens = await cognitoRefresh(tokens.refreshToken);
        await saveAuthTokens(newTokens);
        refreshQueue.forEach((cb) => cb(newTokens.accessToken));
        refreshQueue = [];
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newTokens.accessToken}` };
        return api(original);
      } catch {
        await clearAuthTokens();
        // Caller will navigate to Login
        throw error;
      } finally {
        isRefreshing = false;
      }
    }
    throw error;
  },
);

// ── Evidence Service endpoints ────────────────────────────────

/**
 * Upload a captured evidence capsule.
 * Multipart form-data: image file + SubmitCapsuleDto fields
 */
export async function uploadCapsule(
  imageUri: string,
  imageName: string,
  fields: {
    tenantId:        string;
    iebcStationCode: string;
    positionCode:    string;
    electionYear:    number;
    sha256Hash:      string;
    capturedAt:      string;
    partyOrg?:       string;
    latitude?:       number;
    longitude?:      number;
    altitude?:       number;
    accuracyMeters?: number;
  },
): Promise<{ id: string; status: string }> {
  const formData = new FormData();

  // Image file — React Native FormData requires the {uri, name, type} shape
  formData.append('image', {
    uri:  imageUri,
    name: imageName,
    type: 'image/jpeg',
  } as any);

  // SubmitCapsuleDto fields
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const res = await api.post<{ id: string; status: string }>(
    '/api/v1/evidence/capsules',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

/**
 * Update sync status of a capsule (optional mobile→server progress report).
 */
export async function updateSyncStatus(
  serverId: string,
  syncStatus: string,
): Promise<void> {
  await api.patch(`/api/v1/evidence/capsules/${serverId}/sync`, { syncStatus });
}

// ── Election Service endpoints ─────────────────────────────────

/**
 * Validate a 15-digit IEBC station code and return full context.
 * Used before accepting a capture submission.
 */
export async function validateStation(code: string) {
  const res = await api.get(`/api/v1/election/polling-stations/${code}/validate`);
  return res.data;
}

/**
 * Search polling stations by name (for station lookup screen).
 */
export async function searchStations(query: string, limit = 20) {
  const res = await api.get('/api/v1/election/polling-stations', {
    params: { q: query, limit },
  });
  return res.data;
}

/**
 * Get active election for current tenant.
 */
export async function getActiveElection(tenantId: string) {
  const res = await api.get('/api/v1/election/elections/active', {
    headers: { 'X-Tenant-Id': tenantId },
  });
  return res.data;
}

// ── Auth (Cognito hosted UI token endpoint) ───────────────────

const COGNITO_DOMAIN =
  Constants.expoConfig?.extra?.cognitoDomain ??
  'https://vote-capsule.auth.us-east-1.amazoncognito.com';

const COGNITO_CLIENT_ID =
  Constants.expoConfig?.extra?.cognitoClientId ?? '5qv2glumv6kd2652hqdrs6ufp';

export async function cognitoLogin(
  email: string,
  password: string,
): Promise<AuthTokens> {
  // Use the Cognito USER_PASSWORD_AUTH flow directly via the /oauth2/token endpoint
  // For production this is replaced with Amplify hosted UI + PKCE
  const res = await axios.post(
    `${COGNITO_DOMAIN}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id:  COGNITO_CLIENT_ID,
      username:   email,
      password,
      scope:      'openid profile email',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const { access_token, id_token, refresh_token, expires_in } = res.data;
  return {
    accessToken:  access_token,
    idToken:      id_token,
    refreshToken: refresh_token,
    expiresAt:    Date.now() + expires_in * 1000,
  };
}

export async function cognitoRefresh(refreshToken: string): Promise<AuthTokens> {
  const res = await axios.post(
    `${COGNITO_DOMAIN}/oauth2/token`,
    new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     COGNITO_CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const { access_token, id_token, expires_in } = res.data;
  const existing = await getAuthTokens();
  return {
    accessToken:  access_token,
    idToken:      id_token,
    refreshToken: existing?.refreshToken ?? refreshToken,
    expiresAt:    Date.now() + expires_in * 1000,
  };
}

export default api;
