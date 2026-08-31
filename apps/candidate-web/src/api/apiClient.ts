/**
 * Vote Capsule™ Candidate Portal — Axios API Client
 *
 * Single client pointing at API Gateway. Injects auth + campaign service headers.
 *
 * IMPORTANT — 401 handling:
 *   Only logout on token-expiry 401s from auth endpoints.
 *   Business endpoint 401s (permissions, unbuilt routes) do NOT logout the user.
 */
import axios, { InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

const AUTH_PATHS       = ['/auth/', '/identity/auth', '/token', '/refresh'];
const PERMISSION_PATHS = ['/identity/assignments', '/identity/agents', '/campaign/'];

function shouldLogout(url: string, status: number): boolean {
  if (status !== 401) return false;
  if (AUTH_PATHS.some((p) => url.includes(p)))       return true;
  if (PERMISSION_PATHS.some((p) => url.includes(p))) return false;
  return true;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { auth } = store.getState();

  if (auth.accessToken)   config.headers.Authorization         = `Bearer ${auth.accessToken}`;
  if (auth.user?.tenantId) config.headers['x-tenant-id']       = auth.user.tenantId;
  if (auth.user?.id)       config.headers['x-user-id']          = auth.user.id;
  if (auth.user?.roles?.length) config.headers['x-user-role']  = auth.user.roles[0];

  const user = auth.user as any;
  const candidateId = user?.candidateId ?? auth.user?.id;
  if (candidateId)             config.headers['x-candidate-id']       = candidateId;
  if (user?.wardCode)          config.headers['x-ward-code']          = user.wardCode;
  if (user?.constituencyCode)  config.headers['x-constituency-code']  = user.constituencyCode;

  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url    = (err.config?.url as string) ?? '';
    const status = err.response?.status as number;
    if (shouldLogout(url, status)) store.dispatch(logout());
    return Promise.reject(err);
  },
);
