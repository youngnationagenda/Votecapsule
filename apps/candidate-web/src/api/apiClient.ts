/**
 * Vote Capsule™ Candidate Portal — Axios API Client
 *
 * Single client pointing at API Gateway. Injects:
 *   Authorization       Bearer JWT
 *   x-tenant-id         From auth store (required by campaign + candidate services)
 *   x-user-id           From auth store (required by campaign service)
 *   x-user-role         Primary role (required by campaign role guard)
 *   x-ward-code         If user is geo-scoped
 *   x-constituency-code If user is geo-scoped
 *   x-candidate-id      Candidate UUID (for CANDIDATE_CAMPAIGN_PRINCIPAL scoping)
 *
 * Token Refresh:
 *   On 401, attempts silent token refresh using stored refresh token.
 *   Only logs user out if refresh itself fails.
 */
import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { store } from '../store';
import { logout, tokenRefreshed } from '../store/slices/authSlice';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — inject auth + campaign service headers ──
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { auth } = store.getState();

  // JWT
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  // Tenant isolation
  if (auth.user?.tenantId) {
    config.headers['x-tenant-id'] = auth.user.tenantId;
  }

  // User identity
  if (auth.user?.id) {
    config.headers['x-user-id'] = auth.user.id;
  }

  // Campaign role guard
  if (auth.user?.roles?.length) {
    config.headers['x-user-role'] = auth.user.roles[0];
  }

  // Candidate-specific headers
  const user = auth.user as any;

  // For candidates, x-candidate-id is their own user ID
  // (candidateId may be set explicitly or fall back to user.id)
  const candidateId = user?.candidateId ?? auth.user?.id;
  if (candidateId) {
    config.headers['x-candidate-id'] = candidateId;
  }

  if (user?.wardCode) {
    config.headers['x-ward-code'] = user.wardCode;
  }
  if (user?.constituencyCode) {
    config.headers['x-constituency-code'] = user.constituencyCode;
  }

  return config;
});

// ── Token refresh state (shared across concurrent requests) ─────
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

// Paths that should NOT trigger a refresh attempt (auth endpoints)
const AUTH_PATHS = ['/identity/auth/login', '/identity/auth/refresh', '/identity/auth/mfa/verify'];

function isAuthPath(url?: string): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((p) => url.includes(p));
}

// ── Response interceptor — handle 401 with token refresh ─────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 responses
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't retry auth endpoints themselves (infinite loop prevention)
    if (isAuthPath(originalRequest?.url)) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    // Don't retry if we already retried this request
    if (originalRequest._retry) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    const { auth } = store.getState();
    const refreshToken = auth.refreshToken;

    // No refresh token available — must logout
    if (!refreshToken) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          originalRequest._retry = true;
          resolve(apiClient(originalRequest));
        });
      });
    }

    // Attempt token refresh
    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/identity/auth/refresh`, {
        refreshToken,
      });

      const result = data.data ?? data;
      const newAccessToken = result.accessToken;
      const newRefreshToken = result.refreshToken ?? refreshToken;
      const expiresIn = result.expiresIn ?? 3600;

      // Update store with new tokens
      store.dispatch(tokenRefreshed({
        accessToken: newAccessToken,
        expiresIn,
        refreshToken: newRefreshToken,
      }));

      // Notify all queued requests
      onTokenRefreshed(newAccessToken);
      isRefreshing = false;

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed — token is truly dead, must re-login
      isRefreshing = false;
      refreshSubscribers = [];
      store.dispatch(logout());
      return Promise.reject(refreshError);
    }
  },
);
