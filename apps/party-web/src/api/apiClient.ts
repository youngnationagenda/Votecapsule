/**
 * Vote Capsule™ Party Portal — Axios API Client
 *
 * Single client pointing at API Gateway. Injects:
 *   Authorization       Bearer JWT
 *   x-tenant-id         From auth store (required by campaign + candidate services)
 *   x-user-id           From auth store (required by campaign service)
 *   x-user-role         Primary role (required by campaign role guard)
 *   x-ward-code         If user is geo-scoped (ward coordinator)
 *   x-constituency-code If user is geo-scoped (constituency coordinator)
 *   x-candidate-id      If user is a candidate
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

  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  if (auth.user?.tenantId) {
    config.headers['x-tenant-id'] = auth.user.tenantId;
  }
  if (auth.user?.id) {
    config.headers['x-user-id'] = auth.user.id;
  }
  if (auth.user?.roles?.length) {
    config.headers['x-user-role'] = auth.user.roles[0];
  }

  const user = auth.user as any;
  if (user?.wardCode) {
    config.headers['x-ward-code'] = user.wardCode;
  }
  if (user?.constituencyCode) {
    config.headers['x-constituency-code'] = user.constituencyCode;
  }
  if (user?.candidateId) {
    config.headers['x-candidate-id'] = user.candidateId;
  }

  return config;
});

// ── Token refresh state ─────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
function subscribeTokenRefresh(cb: (token: string) => void) { refreshSubscribers.push(cb); }
function onTokenRefreshed(newToken: string) { refreshSubscribers.forEach((cb) => cb(newToken)); refreshSubscribers = []; }

const AUTH_PATHS = ['/identity/auth/login', '/identity/auth/refresh', '/identity/auth/mfa/verify'];
function isAuthPath(url?: string): boolean { return AUTH_PATHS.some((p) => url?.includes(p)); }

// ── Response interceptor — 401 triggers silent refresh ──────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401) return Promise.reject(error);
    if (isAuthPath(originalRequest?.url) || originalRequest._retry) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    const refreshToken = store.getState().auth.refreshToken;
    if (!refreshToken) { store.dispatch(logout()); return Promise.reject(error); }

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          originalRequest._retry = true;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/identity/auth/refresh`, { refreshToken });
      const result = data.data ?? data;
      store.dispatch(tokenRefreshed({
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        refreshToken: result.refreshToken,
      }));
      onTokenRefreshed(result.accessToken);
      isRefreshing = false;
      originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
      return apiClient(originalRequest);
    } catch {
      isRefreshing = false;
      refreshSubscribers = [];
      store.dispatch(logout());
      return Promise.reject(error);
    }
  },
);
