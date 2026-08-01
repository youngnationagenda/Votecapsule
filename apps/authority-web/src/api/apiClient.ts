import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) store.dispatch(logout());
    return Promise.reject(err);
  },
);

// Service-specific clients
export const electionClient = Object.assign(apiClient, { defaults: { ...apiClient.defaults, baseURL: `${BASE_URL}/election` } });
export const geographyClient = Object.assign(Object.create(apiClient), { defaults: { ...apiClient.defaults, baseURL: `${BASE_URL}/geography` } });
export const evidenceClient = Object.assign(Object.create(apiClient), { defaults: { ...apiClient.defaults, baseURL: `${BASE_URL}/evidence` } });
export const candidateClient = Object.assign(Object.create(apiClient), { defaults: { ...apiClient.defaults, baseURL: `${BASE_URL}/candidate` } });
export const reportingClient = Object.assign(Object.create(apiClient), { defaults: { ...apiClient.defaults, baseURL: `${BASE_URL}/reporting` } });
export const identityClient = Object.assign(Object.create(apiClient), { defaults: { ...apiClient.defaults, baseURL: `${BASE_URL}/identity` } });
