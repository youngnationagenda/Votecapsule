/**
 * Vote Capsule™ Admin Portal — Axios API Client
 *
 * Shared HTTP client with auth token injection and error handling.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
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

export const identityClient = createApiClient(
  import.meta.env['VITE_IDENTITY_API_URL'] ?? '/api/identity',
);

export const tenantClient = createApiClient(
  import.meta.env['VITE_TENANT_API_URL'] ?? '/api/tenant',
);
