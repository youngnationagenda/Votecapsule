/**
 * Vote Capsule™ Admin Portal — Axios API Client
 *
 * All services route through the single API Gateway endpoint.
 * Path prefix per service: /api/v1/{service}/...
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE = (import.meta.env['VITE_API_GATEWAY_URL'] as string | undefined)
  ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

function createApiClient(servicePrefix: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_BASE}/api/v1/${servicePrefix}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  // Inject auth token
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('vc_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 — redirect to login
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('vc_access_token');
        window.location.assign('/login');
      }
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    },
  );

  return client;
}

// Each service client uses its own path prefix
export const identityClient  = createApiClient('identity');
export const tenantClient    = createApiClient('tenant');
export const trustClient     = createApiClient('trust');
export const geographyClient = createApiClient('geography');
export const evidenceClient  = createApiClient('evidence');
export const aiClient        = createApiClient('ai');
export const workflowClient  = createApiClient('workflow');
export const electionClient  = createApiClient('election');
export const reportingClient = createApiClient('reporting');
export const auditClient     = createApiClient('audit');
export const billingClient   = createApiClient('billing');
