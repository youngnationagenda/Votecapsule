import { tenantClient } from './apiClient';
import { PaginatedResponse } from '@vote-capsule/types';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  countryCode: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantPayload {
  name: string;
  type: string;
  countryCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  primaryColor?: string;
}

/**
 * Normalise the response body from the tenant service.
 *
 * The NestJS tenant controller returns plain objects (no ApiResponse envelope):
 *   GET /tenants       → PaginatedResponse<Tenant>  { data: Tenant[], meta: {...} }
 *   GET /tenants/:id   → Tenant
 *   POST /tenants      → Tenant
 *   PATCH /tenants/:id → Tenant
 *   GET /tenants/stats → Record<string, number>
 *
 * Some routes go through an API Gateway transform layer that may wrap them in
 * { success, data: <actual payload> }.  This helper unwraps that outer envelope
 * when present while leaving already-correct shapes untouched.
 */
function unwrap<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    'success' in (body as object) &&
    'data' in (body as object)
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const tenantApi = {
  findAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Tenant>> => {
    const { data } = await tenantClient.get('/tenants', { params });
    return unwrap<PaginatedResponse<Tenant>>(data);
  },

  findById: async (id: string): Promise<Tenant> => {
    const { data } = await tenantClient.get(`/tenants/${id}`);
    return unwrap<Tenant>(data);
  },

  create: async (payload: CreateTenantPayload): Promise<Tenant> => {
    const { data } = await tenantClient.post('/tenants', payload);
    return unwrap<Tenant>(data);
  },

  update: async (id: string, payload: Partial<CreateTenantPayload>): Promise<Tenant> => {
    const { data } = await tenantClient.patch(`/tenants/${id}`, payload);
    return unwrap<Tenant>(data);
  },

  delete: async (id: string): Promise<void> => {
    await tenantClient.delete(`/tenants/${id}`);
  },

  getStats: async (): Promise<Record<string, number>> => {
    const { data } = await tenantClient.get('/tenants/stats');
    return unwrap<Record<string, number>>(data);
  },

  getMembers: async (tenantId: string) => {
    const { data } = await tenantClient.get(`/tenants/${tenantId}/members`);
    return unwrap(data);
  },

  getSettings: async (tenantId: string) => {
    const { data } = await tenantClient.get(`/tenants/${tenantId}/settings`);
    return unwrap(data);
  },

  getSubscription: async (tenantId: string) => {
    const { data } = await tenantClient.get(`/tenants/${tenantId}/subscription`);
    return unwrap(data);
  },
};
