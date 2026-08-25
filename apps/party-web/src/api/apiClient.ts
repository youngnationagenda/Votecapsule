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
 */
import axios, { InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

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

  // Tenant isolation (campaign, candidate, billing services all require this)
  if (auth.user?.tenantId) {
    config.headers['x-tenant-id'] = auth.user.tenantId;
  }

  // User identity (campaign service logs + capsule ownership)
  if (auth.user?.id) {
    config.headers['x-user-id'] = auth.user.id;
  }

  // Campaign role guard — primary role
  if (auth.user?.roles?.length) {
    config.headers['x-user-role'] = auth.user.roles[0];
  }

  // Geography scope (ward coordinator, constituency coordinator)
  const user = auth.user as any;
  if (user?.wardCode) {
    config.headers['x-ward-code'] = user.wardCode;
  }
  if (user?.constituencyCode) {
    config.headers['x-constituency-code'] = user.constituencyCode;
  }

  // Candidate identity (for CANDIDATE_CAMPAIGN_PRINCIPAL scoping)
  if (user?.candidateId) {
    config.headers['x-candidate-id'] = user.candidateId;
  }

  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) store.dispatch(logout());
    return Promise.reject(err);
  },
);
