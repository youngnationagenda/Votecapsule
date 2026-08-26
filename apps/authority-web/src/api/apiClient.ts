import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout, tokenRefreshed } from '../store/slices/authSlice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const { auth } = store.getState();
  if (auth.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.user?.tenantId) config.headers['x-tenant-id'] = auth.user.tenantId;
  if (auth.user?.id) config.headers['x-user-id'] = auth.user.id;
  if (auth.user?.roles?.length) config.headers['x-user-role'] = auth.user.roles[0];
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

// Service-specific clients (share the same interceptors via prototype chain)
export const electionClient = apiClient;
export const geographyClient = apiClient;
export const evidenceClient = apiClient;
export const candidateClient = apiClient;
export const reportingClient = apiClient;
export const identityClient = apiClient;
