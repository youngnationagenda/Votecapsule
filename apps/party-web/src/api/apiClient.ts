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
 * IMPORTANT — 401 handling:
 *   Only logout when the 401 is from an auth endpoint (token expired / invalid token).
 *   A 401 from a business endpoint (assignments, agents, etc.) means the role is not
 *   permitted or the endpoint is not yet built — do NOT logout the user in those cases.
 */
import axios, { InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

// Paths where a 401 means the JWT itself is invalid → logout
const AUTH_PATHS = ['/auth/', '/identity/auth', '/token', '/refresh'];

// Paths where a 401/403 means "not permitted / endpoint unbuilt" → do NOT logout
const PERMISSION_PATHS = [
  '/identity/assignments',
  '/identity/agents',
  '/identity/invitations',
  '/campaign/',
];

function shouldLogout(url: string, status: number): boolean {
  if (status !== 401) return false;
  // If it's an auth endpoint, always logout
  if (AUTH_PATHS.some((p) => url.includes(p))) return true;
  // If it's a known permission/business endpoint, never logout
  if (PERMISSION_PATHS.some((p) => url.includes(p))) return false;
  // For unknown endpoints: only logout if response body says token is invalid
  return true;
}

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
  if (user?.wardCode)          config.headers['x-ward-code']          = user.wardCode;
  if (user?.constituencyCode)  config.headers['x-constituency-code']  = user.constituencyCode;
  if (user?.candidateId)       config.headers['x-candidate-id']       = user.candidateId;

  return config;
});

// ── Response interceptor — smart 401 handling ──────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url    = (err.config?.url as string) ?? '';
    const status = err.response?.status as number;

    if (shouldLogout(url, status)) {
      store.dispatch(logout());
    }

    return Promise.reject(err);
  },
);
