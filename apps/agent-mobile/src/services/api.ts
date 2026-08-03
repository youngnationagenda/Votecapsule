// ============================================================
// VoteCapsule™ — API Client
// apps/agent-mobile/src/services/api.ts
//
// Axios instance for all server calls.
//  - Injects Cognito JWT (access token) on every request
//  - Handles 401 → token refresh → retry once
//  - All capsule submissions go via API Gateway → Evidence Service
// ============================================================
import axios, {
  AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig,
} from 'axios';
import {
  getAuthTokens, saveAuthTokens, clearAuthTokens, getAgentUser,
} from '../utils/storage';
import { AuthTokens } from '../types';
import Constants from 'expo-constants';

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiGatewayUrl as string | undefined) ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

// Cognito InitiateAuth endpoint — NOT the hosted UI OAuth endpoint.
// The mobile app client has AllowedOAuthFlowsUserPoolClient=false,
// so /oauth2/token will NOT work. Must use the AWS service endpoint directly.
const COGNITO_REGION    = 'us-east-1';
const COGNITO_IDP_URL   = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com`;

const COGNITO_CLIENT_ID: string =
  (Constants.expoConfig?.extra?.cognitoClientId as string | undefined) ??
  '5qv2glumv6kd2652hqdrs6ufp'; // Mobile client (not admin client)

// ── Axios instance ────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — inject Bearer token + device headers ─

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const [tokens, user] = await Promise.all([getAuthTokens(), getAgentUser()]);

  if (tokens?.accessToken) {
    config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }
  if (user) {
    config.headers['X-Agent-User-Id'] = user.userId;
    config.headers['X-Device-Id']     = user.deviceId;
    config.headers['X-Tenant-Id']     = user.tenantId;
  }
  return config;
});

// ── Response interceptor — 401 → refresh → retry once ─────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original?._retry) {
      if (!original) throw error;
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            if (original.headers) {
              original.headers['Authorization'] = `Bearer ${token}`;
            }
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const tokens = await getAuthTokens();
        if (!tokens?.refreshToken) throw new Error('No refresh token available');

        const newTokens = await cognitoRefresh(tokens.refreshToken);
        await saveAuthTokens(newTokens);

        refreshQueue.forEach((cb) => cb(newTokens.accessToken));
        refreshQueue = [];

        if (original.headers) {
          original.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
        }
        return api(original);
      } catch (refreshErr) {
        await clearAuthTokens();
        // The auth store will detect missing tokens on next hydrate / check
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    // Format a useful error message from the server response
    const serverMsg = (error.response?.data as any)?.message ?? error.message;
    const statusErr = new Error(
      error.response
        ? `[${error.response.status}] ${serverMsg}`
        : `Network error: ${error.message}`,
    );
    throw statusErr;
  },
);

// ── Evidence Service endpoints ────────────────────────────────

/**
 * Upload a captured evidence capsule as multipart form-data.
 * Returns the server-assigned ID and its initial status.
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
  tallyData?: object | null,
): Promise<{ id: string; status: string }> {
  const formData = new FormData();

  // React Native's FormData accepts the {uri, name, type} shape for files
  formData.append('image', {
    uri:  imageUri,
    name: imageName,
    type: 'image/jpeg',
  } as any);

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  // Include tally data as JSON string if present
  formData.append('tallyData', JSON.stringify(tallyData ?? null));

  const res = await api.post<{ id: string; status: string }>(
    '/api/v1/evidence/capsules',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

/**
 * Report sync status progress to the server (optional).
 */
export async function updateSyncStatus(
  serverId: string,
  syncStatus: string,
): Promise<void> {
  await api.patch(`/api/v1/evidence/capsules/${serverId}/sync`, { syncStatus });
}

/**
 * Submit Form A tally data for an already-uploaded capsule.
 *
 * Called by TallyEntryScreen after the agent enters tally figures.
 * If the capsule has already been uploaded (serverId is known),
 * this sends the structured Form A data to the Evidence Service.
 *
 * The server validates:
 *   - ballotsIssued = validVotes + rejectedBallots + spoiltBallots
 *   - sum(candidate votes) = validVotes
 *   - validVotes <= registeredVoters
 *
 * Returns the updated capsule record with tallyValidationStatus.
 */
export async function submitTallyData(
  serverId: string,
  tallyData: {
    formType: string;
    registeredVoters: number;
    ballotsIssued: number;
    spoiltBallots: number;
    rejectedBallots: number;
    validVotes: number;
    candidates: Array<{
      ballotNumber: number;
      candidateName: string;
      runningMateName?: string;
      deputyName?: string;
      partyAbbreviation: string;
      votes: number;
    }>;
    presidingOfficerName: string;
    declaredAt?: string;
  },
): Promise<{ id: string; tallyValidationStatus: string }> {
  const res = await api.patch<{ id: string; tallyValidationStatus: string }>(
    `/api/v1/evidence/capsules/${serverId}/tally`,
    tallyData,
  );
  return res.data;
}

// ── Election Service endpoints ─────────────────────────────────

/**
 * Validate a 15-digit IEBC station code and return full station context.
 */
export async function validateStation(code: string): Promise<any> {
  const res = await api.get(`/api/v1/election/polling-stations/${code}/validate`);
  return res.data;
}

/**
 * Search polling stations by name, centre, or constituency.
 */
export async function searchStations(query: string, limit = 20): Promise<any[]> {
  const res = await api.get('/api/v1/election/polling-stations', {
    params: { q: query, limit },
  });
  return res.data;
}

/**
 * Get the active election for the current tenant.
 */
export async function getActiveElection(tenantId: string): Promise<any> {
  const res = await api.get('/api/v1/election/elections/active', {
    headers: { 'X-Tenant-Id': tenantId },
  });
  return res.data;
}

// ── Auth (Cognito InitiateAuth API) ──────────────────────────
//
// IMPORTANT: The mobile Cognito client has AllowedOAuthFlowsUserPoolClient=false.
// DO NOT use /oauth2/token — it will return "unsupported_grant_type".
// Instead call the AWS Cognito service endpoint directly with InitiateAuth.
// This is the correct approach for trusted first-party mobile apps.

/**
 * Authenticate via Cognito InitiateAuth (USER_PASSWORD_AUTH).
 *
 * POST https://cognito-idp.{region}.amazonaws.com
 * Headers: X-Amz-Target: AmazonCognitoIdentityProviderService.InitiateAuth
 * Body: JSON { AuthFlow, ClientId, AuthParameters }
 *
 * Returns: { AuthenticationResult: { AccessToken, IdToken, RefreshToken, ExpiresIn } }
 */
export async function cognitoLogin(
  email: string,
  password: string,
): Promise<AuthTokens> {
  try {
    const res = await axios.post(
      COGNITO_IDP_URL,
      {
        AuthFlow:       'USER_PASSWORD_AUTH',
        ClientId:       COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      },
      {
        headers: {
          'Content-Type':  'application/x-amz-json-1.1',
          'X-Amz-Target':  'AmazonCognitoIdentityProviderService.InitiateAuth',
        },
        timeout: 20_000,
      },
    );

    const result = res.data?.AuthenticationResult;
    if (!result) {
      // Challenge returned (e.g. NEW_PASSWORD_REQUIRED, SOFTWARE_TOKEN_MFA)
      const challenge = res.data?.ChallengeName;
      throw new Error(
        challenge === 'NEW_PASSWORD_REQUIRED'
          ? 'Your password must be changed. Contact your administrator.'
          : challenge === 'SOFTWARE_TOKEN_MFA'
          ? 'MFA_REQUIRED' // AuthStore handles this
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
      if (code === 'NotAuthorizedException')   throw new Error('Incorrect email or password. Please try again.');
      if (code === 'UserNotFoundException')    throw new Error('No account found for this email address.');
      if (code === 'UserNotConfirmedException') throw new Error('Account is not confirmed. Check your email.');
      if (code === 'PasswordResetRequiredException') throw new Error('Password reset required. Contact your administrator.');
      if (msg) throw new Error(msg);
    }
    throw err;
  }
}

/**
 * Refresh Cognito tokens via InitiateAuth REFRESH_TOKEN_AUTH flow.
 */
export async function cognitoRefresh(refreshToken: string): Promise<AuthTokens> {
  const res = await axios.post(
    COGNITO_IDP_URL,
    {
      AuthFlow:       'REFRESH_TOKEN_AUTH',
      ClientId:       COGNITO_CLIENT_ID,
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
  const existing = await getAuthTokens();
  return {
    accessToken:  result.AccessToken,
    idToken:      result.IdToken,
    refreshToken: result.RefreshToken ?? existing?.refreshToken ?? refreshToken, // Cognito may not rotate
    expiresAt:    Date.now() + (result.ExpiresIn ?? 3600) * 1000,
  };
}

export default api;
