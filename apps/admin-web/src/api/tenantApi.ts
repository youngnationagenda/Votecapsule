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

export const tenantApi = {
  findAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Tenant>> => {
    const { data } = await tenantClient.get('/tenants', { params });
    return (data.data ?? data) as PaginatedResponse<Tenant>;
  },

  findById: async (id: string): Promise<Tenant> => {
    const { data } = await tenantClient.get(`/tenants/${id}`);
    return (data.data ?? data) as Tenant;
  },

  create: async (payload: CreateTenantPayload): Promise<Tenant> => {
    const { data } = await tenantClient.post('/tenants', payload);
    return (data.data ?? data) as Tenant;
  },

  update: async (id: string, payload: Partial<CreateTenantPayload>): Promise<Tenant> => {
    const { data } = await tenantClient.patch(`/tenants/${id}`, payload);
    return (data.data ?? data) as Tenant;
  },

  delete: async (id: string): Promise<void> => {
    await tenantClient.delete(`/tenants/${id}`);
  },

  getStats: async (): Promise<Record<string, number>> => {
    const { data } = await tenantClient.get('/tenants/stats');
    return (data.data ?? data) as Record<string, number>;
  },

  getMembers: async (tenantId: string) => {
    const { data } = await tenantClient.get(`/tenants/${tenantId}/members`);
    return data.data ?? data;
  },

  getSettings: async (tenantId: string) => {
    const { data } = await tenantClient.get(`/tenants/${tenantId}/settings`);
    return data.data ?? data;
  },

  getSubscription: async (tenantId: string) => {
    const { data } = await tenantClient.get(`/tenants/${tenantId}/subscription`);
    return data.data ?? data;
  },
};
