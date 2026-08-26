/**
 * Vote Capsule™ Admin Portal — Campaign API Client
 *
 * Admin-level campaign queries — crosses all tenants (global scope).
 * Super Admin sees all campaigns; role-based checks enforced by backend.
 */
import { campaignClient } from './apiClient';

export interface Campaign {
  id: string;
  tenantId: string;
  tenantName?: string;
  candidateId: string;
  electionId: string;
  partyId: string | null;
  name: string;
  description: string | null;
  status: 'created' | 'planning' | 'active' | 'suspended' | 'closed' | 'audited' | 'archived';
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  headquarters: string | null;
  countyCode: string | null;
  constituencyCode: string | null;
  wardCode: string | null;
  targetWards: string[];
  goals: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignEvent {
  id: string;
  campaignId: string;
  tenantId: string;
  eventName: string;
  eventType: string;
  startTime: string;
  endTime: string;
  venueName: string | null;
  countyCode: string | null;
  constituencyCode: string | null;
  wardCode: string | null;
  expectedAttendance: number;
  actualAttendance: number | null;
  status: string;
  budgetEstimate: number;
  requiresSecurity: boolean;
  requiresStage: boolean;
  requiresPaSystem: boolean;
}

export interface CampaignTask {
  id: string;
  campaignId: string;
  tenantId: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  dueDate: string | null;
  assignedToName: string | null;
  wardCode: string | null;
}

export interface CampaignTeam {
  id: string;
  campaignId: string;
  tenantId: string;
  teamName: string;
  teamType: string;
  teamLeaderName: string | null;
  countyCode: string | null;
  wardCode: string | null;
  isActive: boolean;
  members?: { id: string; userName: string; campaignRole: string }[];
}

export interface CampaignBudget {
  id: string;
  campaignId: string;
  tenantId: string;
  totalAllocated: number;
  totalCommitted: number;
  totalSpent: number;
  iebcSpendingLimit: number | null;
  currency: string;
  categories?: CampaignBudgetCategory[];
}

export interface CampaignBudgetCategory {
  categoryCode: string;
  categoryName: string;
  allocated: number;
  committed: number;
  spent: number;
}

export interface CampaignStats {
  total: number;
  active: number;
  planning: number;
  suspended: number;
  closed: number;
}

// ── API helpers ──────────────────────────────────────────────

function unwrap<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

// Headers for super admin — no tenant scoping (sees all tenants).
// x-user-id is pulled from localStorage so the real user UUID is attributed in audit logs.
const adminHeaders = () => ({
  'x-tenant-id': 'platform',
  'x-user-id':   localStorage.getItem('vc_user_id') ?? 'platform-admin',
});

export const campaignApi = {

  // ── List all campaigns (admin: all tenants) ───────────────

  listAll: async (params?: { status?: string; tenantId?: string; page?: number; limit?: number }): Promise<{ data: Campaign[]; meta?: { total: number } }> => {
    const { data } = await campaignClient.get('/campaigns', {
      headers: adminHeaders(),
      params: {
        status:   params?.status,
        tenantId: params?.tenantId,
        page:     params?.page ?? 1,
        limit:    params?.limit ?? 100,
      },
    });
    if (Array.isArray(data)) return { data };
    return unwrap<{ data: Campaign[]; meta?: { total: number } }>(data);
  },

  // ── Get single campaign ───────────────────────────────────

  get: async (id: string, tenantId: string): Promise<Campaign> => {
    const { data } = await campaignClient.get(`/campaigns/${id}`, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    return unwrap<Campaign>(data);
  },

  // ── Get dashboard stats ───────────────────────────────────

  getDashboard: async (id: string, tenantId: string): Promise<Record<string, unknown>> => {
    const { data } = await campaignClient.get(`/campaigns/${id}/dashboard`, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    return unwrap<Record<string, unknown>>(data);
  },

  // ── Update campaign status ────────────────────────────────

  updateStatus: async (id: string, tenantId: string, status: string): Promise<Campaign> => {
    const { data } = await campaignClient.patch(`/campaigns/${id}/status`, { status }, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    return unwrap<Campaign>(data);
  },

  // ── Get campaign events ───────────────────────────────────

  getEvents: async (id: string, tenantId: string): Promise<CampaignEvent[]> => {
    const { data } = await campaignClient.get(`/campaigns/${id}/events`, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    if (Array.isArray(data)) return data;
    return unwrap<CampaignEvent[]>(data);
  },

  // ── Get campaign tasks ────────────────────────────────────

  getTasks: async (id: string, tenantId: string): Promise<CampaignTask[]> => {
    const { data } = await campaignClient.get(`/campaigns/${id}/tasks`, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    if (Array.isArray(data)) return data;
    return unwrap<CampaignTask[]>(data);
  },

  // ── Get campaign teams ────────────────────────────────────

  getTeams: async (id: string, tenantId: string): Promise<CampaignTeam[]> => {
    const { data } = await campaignClient.get(`/campaigns/${id}/teams`, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    if (Array.isArray(data)) return data;
    return unwrap<CampaignTeam[]>(data);
  },

  // ── Get campaign budget ───────────────────────────────────

  getBudget: async (id: string, tenantId: string): Promise<CampaignBudget> => {
    const { data } = await campaignClient.get(`/campaigns/${id}/budget`, {
      headers: { 'x-tenant-id': tenantId, 'x-user-id': 'admin' },
    });
    return unwrap<CampaignBudget>(data);
  },

  // ── Global stats aggregation (computed client-side) ───────

  computeStats: (campaigns: Campaign[]): CampaignStats => ({
    total:     campaigns.length,
    active:    campaigns.filter(c => c.status === 'active').length,
    planning:  campaigns.filter(c => c.status === 'planning').length,
    suspended: campaigns.filter(c => c.status === 'suspended').length,
    closed:    campaigns.filter(c => ['closed','archived','audited'].includes(c.status)).length,
  }),
};
