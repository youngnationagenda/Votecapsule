import { identityClient } from './apiClient';
import { PaginatedResponse, PaginationQuery } from '@vote-capsule/types';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roles?: string[];
  tenantId?: string | null;
  profile?: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface Invitation {
  id: string;
  email: string;
  tenantId: string | null;
  roleId: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string;
  roleId?: string;
  roles?: string[];   // Cognito custom:roles — e.g. ["CAPSULE_AGENT"]
  password?: string;  // Temp password set via Cognito admin
}

export interface SystemRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

/**
 * Unwrap optional { success, data: <payload> } API Gateway envelope.
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

export const usersApi = {
  // ── Read ──────────────────────────────────────────────────

  findAll: async (params?: PaginationQuery): Promise<PaginatedResponse<User>> => {
    const { data } = await identityClient.get('/users', { params });
    return unwrap<PaginatedResponse<User>>(data);
  },

  findById: async (id: string): Promise<User> => {
    const { data } = await identityClient.get(`/users/${id}`);
    return unwrap<User>(data);
  },

  // ── Create / Invite ───────────────────────────────────────

  /**
   * Create a user directly (DB record + Cognito via admin API).
   * Used by Superadmin to provision agents, validators, observers, etc.
   */
  createUser: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await identityClient.post('/users/provision', payload);
    return unwrap<User>(data);
  },

  /**
   * Send an invitation email.
   * The invitee clicks the link → sets their password → account becomes active.
   */
  invite: async (payload: {
    email: string;
    tenantId?: string;
    roleId?: string;
    roleName?: string;
  }): Promise<Invitation> => {
    const { data } = await identityClient.post('/invitations', payload);
    return unwrap<Invitation>(data);
  },

  listInvitations: async (tenantId?: string): Promise<Invitation[]> => {
    const { data } = await identityClient.get('/invitations', {
      params: tenantId ? { tenantId } : undefined,
    });
    return unwrap<Invitation[]>(data);
  },

  revokeInvitation: async (id: string): Promise<void> => {
    await identityClient.delete(`/invitations/${id}`);
  },

  // ── Update ────────────────────────────────────────────────

  update: async (id: string, payload: {
    status?: string;
    roles?: string[];
    tenantId?: string;
  }): Promise<User> => {
    const { data } = await identityClient.patch(`/users/${id}`, payload);
    return unwrap<User>(data);
  },

  assignRole: async (userId: string, roleId: string, tenantId?: string): Promise<void> => {
    await identityClient.post(`/users/${userId}/roles`, { roleId, tenantId });
  },

  removeRole: async (userId: string, roleId: string): Promise<void> => {
    await identityClient.delete(`/users/${userId}/roles/${roleId}`);
  },

  // ── Roles reference ───────────────────────────────────────

  listRoles: async (): Promise<SystemRole[]> => {
    try {
      const { data } = await identityClient.get('/roles');
      return unwrap<SystemRole[]>(data);
    } catch {
      // Fallback — return hardcoded system roles if endpoint not live
      return MOBILE_ROLES;
    }
  },
};

// ── Mobile-facing role definitions ────────────────────────────
// These match the SystemRole enum values used across the platform.
export const MOBILE_ROLES: SystemRole[] = [
  { id: 'capsule-agent',      name: 'CAPSULE_AGENT',        description: 'Field agent who captures polling station evidence', isSystem: true },
  { id: 'validator',          name: 'VALIDATOR',             description: 'Reviews and approves/rejects captured capsules',    isSystem: true },
  { id: 'observer',           name: 'OBSERVER',              description: 'Election observer — read-only access',              isSystem: true },
  { id: 'candidate',          name: 'CANDIDATE',             description: 'Registered electoral candidate',                    isSystem: true },
  { id: 'party-admin',        name: 'PARTY_ADMIN',           description: 'Political party administrator',                     isSystem: true },
  { id: 'tenant-admin',       name: 'TENANT_ADMIN',          description: 'Tenant-level administrator',                        isSystem: true },
  { id: 'election-authority', name: 'ELECTION_AUTHORITY',    description: 'Election authority staff (IEBC)',                   isSystem: true },
  { id: 'returning-officer',  name: 'RETURNING_OFFICER',     description: 'Constituency returning officer',                    isSystem: true },
  { id: 'support-admin',      name: 'SUPPORT_ADMIN',         description: 'Platform support administrator',                    isSystem: true },
  { id: 'platform-super-admin', name: 'PLATFORM_SUPER_ADMIN', description: 'Full platform super administrator',               isSystem: true },
];

// ── Role → human label mapping ─────────────────────────────────
export const ROLE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  CAPSULE_AGENT:        { label: 'Field Agent',          color: 'bg-blue-50 text-blue-700',    emoji: '📷' },
  VALIDATOR:            { label: 'Validator',             color: 'bg-purple-50 text-purple-700', emoji: '🔍' },
  OBSERVER:             { label: 'Observer',              color: 'bg-teal-50 text-teal-700',    emoji: '👁️' },
  CANDIDATE:            { label: 'Candidate',             color: 'bg-orange-50 text-orange-700', emoji: '🏛️' },
  PARTY_ADMIN:          { label: 'Party Admin',           color: 'bg-pink-50 text-pink-700',    emoji: '🎗️' },
  TENANT_ADMIN:         { label: 'Tenant Admin',          color: 'bg-indigo-50 text-indigo-700', emoji: '🏢' },
  ELECTION_AUTHORITY:   { label: 'Election Authority',    color: 'bg-amber-50 text-amber-700',  emoji: '⚖️' },
  RETURNING_OFFICER:    { label: 'Returning Officer',     color: 'bg-cyan-50 text-cyan-700',    emoji: '📋' },
  SUPPORT_ADMIN:        { label: 'Support Admin',         color: 'bg-slate-50 text-slate-700',  emoji: '🛠️' },
  PLATFORM_SUPER_ADMIN: { label: 'Super Admin',           color: 'bg-red-50 text-red-700',      emoji: '👑' },
};
