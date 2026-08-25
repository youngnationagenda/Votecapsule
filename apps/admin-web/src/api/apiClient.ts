/**
 * Vote Capsule™ Admin Portal — Axios API Client
 *
 * All services route through the single API Gateway endpoint.
 * Path prefix per service: /api/v1/{service}/...
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE = (import.meta.env['VITE_API_GATEWAY_URL'] as string | undefined)
  ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

/**
 * Paths that return 401/403 by design (behind API Gateway JWT authorizer)
 * and should NOT trigger a session logout. Health checks are expected to
 * return 401 when hit through the gateway without a token refresh.
 */
const AUTH_EXEMPT_PATHS = ['/health'];

/** Debounce flag — prevents multiple 401s from all triggering navigation */
let isLoggingOut = false;

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

  // Handle 401 — soft redirect to login (skip health checks)
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const requestPath = error.config?.url ?? '';
        const isExempt = AUTH_EXEMPT_PATHS.some(p => requestPath.endsWith(p));

        // Only logout on genuine auth failures, not health probes
        if (!isExempt && !isLoggingOut) {
          isLoggingOut = true;
          localStorage.removeItem('vc_access_token');
          // Soft redirect — gives React time to unmount cleanly
          setTimeout(() => {
            window.location.replace('/login');
            isLoggingOut = false;
          }, 100);
        }
      }
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
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
