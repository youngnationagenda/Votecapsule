import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';
export const apiClient = axios.create({ baseURL: BASE_URL, timeout: 30_000, headers: { 'Content-Type': 'application/json' } });
// Observer — read-only. No write operations permitted.
apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (['POST','PUT','PATCH','DELETE'].includes(config.method?.toUpperCase() ?? '')) {
    console.warn('[Observer Portal] Write operation blocked by policy:', config.method, config.url);
  }
  return config;
});
apiClient.interceptors.response.use((res) => res, (err) => { if (err.response?.status === 401) store.dispatch(logout()); return Promise.reject(err); });
