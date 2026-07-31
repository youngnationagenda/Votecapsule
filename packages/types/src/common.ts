/**
 * Vote Capsule™ Common Shared Types
 *
 * These types are used across all services and applications.
 * Never duplicate these in individual services.
 */

// ============================================================
// Pagination
// ============================================================

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ============================================================
// API Response Envelope
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  meta?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

// ============================================================
// Entity Base
// ============================================================

export interface BaseEntity {
  id: string;          // UUID
  createdAt: string;   // ISO 8601 UTC
  updatedAt: string;   // ISO 8601 UTC
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: string | null;
}

// ============================================================
// Status Enums
// ============================================================

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum TenantType {
  ELECTION_AUTHORITY = 'election_authority',
  POLITICAL_PARTY = 'political_party',
  OBSERVER = 'observer',
  MEDIA = 'media',
  INDEPENDENT_CANDIDATE = 'independent_candidate',
  CIVIL_SOCIETY = 'civil_society',
  GOVERNMENT_AGENCY = 'government_agency',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  PENDING = 'pending',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum DeviceType {
  MOBILE = 'mobile',
  WEB = 'web',
  TABLET = 'tablet',
}

export enum RoleLevel {
  PLATFORM = 'platform',
  TENANT = 'tenant',
  GEOGRAPHY = 'geography',
}

// ============================================================
// System Role Names
// ============================================================

export enum SystemRole {
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  ELECTION_COMMISSIONER = 'ELECTION_COMMISSIONER',
  RETURNING_OFFICER = 'RETURNING_OFFICER',
  PRESIDING_OFFICER = 'PRESIDING_OFFICER',
  CAPSULE_AGENT = 'CAPSULE_AGENT',
  VALIDATOR = 'VALIDATOR',
  PARTY_ADMIN = 'PARTY_ADMIN',
  PARTY_AGENT = 'PARTY_AGENT',
  CANDIDATE = 'CANDIDATE',
  OBSERVER_ADMIN = 'OBSERVER_ADMIN',
  OBSERVER_AGENT = 'OBSERVER_AGENT',
  MEDIA_ADMIN = 'MEDIA_ADMIN',
  MEDIA_REPORTER = 'MEDIA_REPORTER',
  PUBLIC = 'PUBLIC',
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
}

// ============================================================
// Evidence Capsule Status
// ============================================================

export enum CapsuleStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  AI_VERIFIED = 'ai_verified',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
}

// ============================================================
// Auth
// ============================================================

export interface JwtPayload {
  sub: string;           // User UUID
  email: string;
  cognitoSub?: string;
  roles: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
