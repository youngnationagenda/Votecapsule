// ============================================================
// VoteCapsule -- Validator API Client
// apps/validator-mobile/src/services/api.ts
//
// Axios instance for all server calls.
// - Injects Cognito JWT (access token) on every request
// - Handles 401 -> token refresh -> retry once
// - Validation-specific endpoints for review queue
//
// NOTE: Uses Cognito InitiateAuth (USER_PASSWORD_AUTH) directly
// — NOT /oauth2/token. The mobile client has
// AllowedOAuthFlowsUserPoolClient=false so the hosted UI
// OAuth endpoint will return "unsupported_grant_type".
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

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiGatewayUrl as string | undefined) ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

// Cognito InitiateAuth endpoint (AWS service — NOT hosted UI /oauth2/token)
const COGNITO_REGION = 'us-east-1';
const COGNITO_IDP_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com`;

const COGNITO_CLIENT_ID: string =
  (Constants.expoConfig?.extra?.cognitoClientId as string | undefined) ??
  '5qv2glumv6kd2652hqdrs6ufp'; // Mobile client (not admin client)

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
//
// Uses InitiateAuth (USER_PASSWORD_AUTH / REFRESH_TOKEN_AUTH)
// directly against the Cognito service endpoint.
// This is the correct approach for mobile clients where the
// hosted UI OAuth flows are disabled.

export async function cognitoLogin(
  email: string,
  password: string,
): Promise<AuthTokens> {
  try {
    const res = await axios.post(
      COGNITO_IDP_URL,
      {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      },
      {
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AmazonCognitoIdentityProviderService.InitiateAuth',
        },
        timeout: 20_000,
      },
    );

    const result = res.data?.AuthenticationResult;
    if (!result) {
      const challenge = res.data?.ChallengeName;
      throw new Error(
        challenge === 'NEW_PASSWORD_REQUIRED'
          ? 'Your password must be changed. Contact your administrator.'
          : challenge === 'SOFTWARE_TOKEN_MFA'
          ? 'MFA code required — contact your administrator.'
          : `Unexpected auth challenge: ${challenge ?? 'unknown'}`,
      );
    }

    return {
      accessToken:  result.AccessToken,
      idToken:      result.IdToken,
      refreshToken: result.RefreshToken,
      expiresAt:    Date.now() + (result.ExpiresIn ?? 3600) * 1000,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const code = err.response?.data?.__type ?? err.response?.data?.code ?? '';
      const msg  = err.response?.data?.message ?? '';
      if (code === 'NotAuthorizedException')    throw new Error('Incorrect email or password. Please try again.');
      if (code === 'UserNotFoundException')     throw new Error('No account found for this email address.');
      if (code === 'UserNotConfirmedException') throw new Error('Account not confirmed. Check your email.');
      if (code === 'PasswordResetRequiredException') throw new Error('Password reset required. Contact your administrator.');
      if (msg) throw new Error(msg);
    }
    throw err;
  }
}

export async function cognitoRefresh(refreshToken: string): Promise<AuthTokens> {
  const res = await axios.post(
    COGNITO_IDP_URL,
    {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    },
    {
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AmazonCognitoIdentityProviderService.InitiateAuth',
      },
      timeout: 20_000,
    },
  );
  const result = res.data?.AuthenticationResult;
  const existing = await getStoredTokens();
  return {
    accessToken:  result.AccessToken,
    idToken:      result.IdToken,
    refreshToken: result.RefreshToken ?? existing?.refreshToken ?? refreshToken,
    expiresAt:    Date.now() + (result.ExpiresIn ?? 3600) * 1000,
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
