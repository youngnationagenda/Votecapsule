/**
 * Vote Capsule™ Admin Portal — Axios API Client
 *
 * All services route through the single API Gateway endpoint.
 * Path prefix per service: /api/v1/{service}/...
 *
 * Token Refresh:
 *   On 401, attempts silent token refresh using stored refresh token.
 *   Only logs user out if refresh itself fails.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = (import.meta.env['VITE_API_GATEWAY_URL'] as string | undefined)
  ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

/**
 * Paths that return 401/403 by design and should NOT trigger a session logout.
 */
const AUTH_EXEMPT_PATHS = ['/health'];
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/mfa/verify'];

/** Debounce flag — prevents multiple 401s from all triggering navigation */
let isLoggingOut = false;

/** Token refresh state (shared across all service clients) */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
function subscribeTokenRefresh(cb: (token: string) => void) { refreshSubscribers.push(cb); }
function onTokenRefreshed(newToken: string) { refreshSubscribers.forEach((cb) => cb(newToken)); refreshSubscribers = []; }

function doLogout() {
  if (isLoggingOut) return;
  isLoggingOut = true;
  localStorage.removeItem('vc_access_token');
  localStorage.removeItem('vc_refresh_token');
  localStorage.removeItem('vc_token_exp');
  setTimeout(() => {
    window.location.replace('/login');
    isLoggingOut = false;
  }, 100);
}

function createApiClient(servicePrefix: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_BASE}/api/v1/${servicePrefix}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  // Inject auth + platform-admin headers
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token  = localStorage.getItem('vc_access_token');
    const userId = localStorage.getItem('vc_user_id');
    if (config.headers) {
      if (token)  config.headers.Authorization   = `Bearer ${token}`;
      if (userId) config.headers['x-user-id']    = userId;
      // Super admin — bypass tenant isolation on campaign + candidate services
      config.headers['x-user-role']       = 'PLATFORM_SUPER_ADMIN';
      config.headers['x-platform-admin']  = 'true';
    }
    return config;
  });

  // Handle 401 — attempt refresh before logging out
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status !== 401) return Promise.reject(error);

      const requestPath = originalRequest?.url ?? '';
      const isExempt = AUTH_EXEMPT_PATHS.some(p => requestPath.endsWith(p));
      if (isExempt) return Promise.reject(error);

      // Don't retry auth endpoints (would loop)
      const isAuthEndpoint = AUTH_ENDPOINTS.some(p => requestPath.includes(p));
      if (isAuthEndpoint || originalRequest._retry) {
        doLogout();
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('vc_refresh_token');
      if (!refreshToken) {
        doLogout();
        return Promise.reject(error);
      }

      // Queue if already refreshing
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            originalRequest._retry = true;
            resolve(client(originalRequest));
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(`${API_BASE}/api/v1/identity/auth/refresh`, { refreshToken });
        const result = data.data ?? data;
        const newToken = result.accessToken;

        localStorage.setItem('vc_access_token', newToken);
        if (result.refreshToken) localStorage.setItem('vc_refresh_token', result.refreshToken);
        if (result.expiresIn) localStorage.setItem('vc_token_exp', String(Date.now() + result.expiresIn * 1000));

        onTokenRefreshed(newToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        doLogout();
        return Promise.reject(error);
      }
    },
  );

  return client;
}

// Each service client uses its own path prefix
export const identityClient     = createApiClient('identity');
export const tenantClient       = createApiClient('tenant');
export const trustClient        = createApiClient('trust');
export const geographyClient    = createApiClient('geography');
export const evidenceClient     = createApiClient('evidence');
export const aiClient           = createApiClient('ai');
export const workflowClient     = createApiClient('workflow');
export const notificationClient = createApiClient('notification');
export const candidateClient    = createApiClient('candidate');
export const electionClient     = createApiClient('election');
export const reportingClient    = createApiClient('reporting');
export const auditClient        = createApiClient('audit');
export const billingClient      = createApiClient('billing');
export const campaignClient     = createApiClient('campaign');
