// ============================================================
// VoteCapsule -- Validator API Client
// apps/validator-mobile/src/services/api.ts
//
// Axios instance for all server calls.
// - Injects Cognito JWT (access token) on every request
// - Handles 401 -> token refresh -> retry once
// - Validation-specific endpoints for review queue
// ============================================================
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  AuthTokens,
  CapsuleForReview,
  ValidationDecision,
  ValidationHistory,
  ValidatorStats,
} from '../types';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiGatewayUrl ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

const COGNITO_DOMAIN =
  Constants.expoConfig?.extra?.cognitoDomain ??
  'https://vote-capsule.auth.us-east-1.amazoncognito.com';

const COGNITO_CLIENT_ID =
  Constants.expoConfig?.extra?.cognitoClientId ?? '5qv2glumv6kd2652hqdrs6ufp';

// -- Storage Keys ----------------------------------------------

const TOKENS_KEY = 'vc_validator_tokens';

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKENS_KEY);
}

// -- Axios Instance --------------------------------------------

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// -- Request Interceptor: inject Bearer token ------------------

api.interceptors.request.use(async (config) => {
  const tokens = await getStoredTokens();
  if (tokens?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// -- Response Interceptor: 401 -> refresh -> retry -------------

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
        const tokens = await getStoredTokens();
        if (!tokens?.refreshToken) throw new Error('No refresh token');
        const newTokens = await cognitoRefresh(tokens.refreshToken);
        await saveTokens(newTokens);
        refreshQueue.forEach((cb) => cb(newTokens.accessToken));
        refreshQueue = [];
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newTokens.accessToken}` };
        return api(original);
      } catch {
        await clearTokens();
        throw error;
      } finally {
        isRefreshing = false;
      }
    }
    throw error;
  },
);

// -- Cognito Auth Endpoints ------------------------------------

export async function cognitoLogin(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const res = await axios.post(
    `${COGNITO_DOMAIN}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: COGNITO_CLIENT_ID,
      username: email,
      password,
      scope: 'openid profile email',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const { access_token, id_token, refresh_token, expires_in } = res.data;
  return {
    accessToken: access_token,
    idToken: id_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
  };
}

export async function cognitoRefresh(refreshToken: string): Promise<AuthTokens> {
  const res = await axios.post(
    `${COGNITO_DOMAIN}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: COGNITO_CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const { access_token, id_token, expires_in } = res.data;
  const existing = await getStoredTokens();
  return {
    accessToken: access_token,
    idToken: id_token,
    refreshToken: existing?.refreshToken ?? refreshToken,
    expiresAt: Date.now() + expires_in * 1000,
  };
}

// -- Validation Queue Endpoints --------------------------------

export interface PaginatedQueue {
  items: CapsuleForReview[];
  total: number;
  page: number;
  limit: number;
}

export async function getValidationQueue(
  page = 1,
  limit = 20,
): Promise<PaginatedQueue> {
  const res = await api.get<PaginatedQueue>('/api/v1/evidence/validation/queue', {
    params: { page, limit },
  });
  return res.data;
}

export async function getCapsuleDetail(capsuleId: string): Promise<CapsuleForReview> {
  const res = await api.get<CapsuleForReview>(`/api/v1/evidence/capsules/${capsuleId}`);
  return res.data;
}

export async function submitDecision(
  capsuleId: string,
  decision: ValidationDecision,
  reason: string,
): Promise<void> {
  await api.post(`/api/v1/evidence/validation/${capsuleId}/decision`, {
    decision,
    reason,
  });
}

export async function escalateCapsule(
  capsuleId: string,
  reason: string,
): Promise<void> {
  await api.post(`/api/v1/evidence/validation/${capsuleId}/escalate`, { reason });
}

export async function getValidationHistory(
  page = 1,
  limit = 20,
): Promise<{ items: ValidationHistory[]; total: number }> {
  const res = await api.get<{ items: ValidationHistory[]; total: number }>(
    '/api/v1/evidence/validation/my-history',
    { params: { page, limit } },
  );
  return res.data;
}

export async function getValidatorStats(): Promise<ValidatorStats> {
  const res = await api.get<ValidatorStats>('/api/v1/evidence/validation/stats');
  return res.data;
}

// -- Exports ---------------------------------------------------

export default api;
