// ============================================================
// VoteCapsule™ — Campaign Role Guard
// Enforces role-based access on all campaign endpoints
// ============================================================
import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Roles that have full tenant-wide campaign access
const FULL_ACCESS_ROLES = new Set([
  'PARTY_CAMPAIGN_DIRECTOR',
  'PARTY_ADMIN',
  'TENANT_ADMIN',
  'PLATFORM_SUPER_ADMIN',
]);

// Roles scoped to their own campaign/candidate only
const CANDIDATE_ROLES = new Set([
  'CANDIDATE',
  'CANDIDATE_CAMPAIGN_PRINCIPAL',
  'CAMPAIGN_MANAGER',
]);

// Roles scoped to their assigned geography only
const GEO_SCOPED_ROLES = new Set([
  'CONSTITUENCY_COORDINATOR',
  'WARD_COORDINATOR',
]);

// Roles with limited module access (role → allowed module path segments)
const LIMITED_ROLES: Record<string, string[]> = {
  LOGISTICS_OFFICER:      ['vehicles', 'equipment', 'events', 'tasks', 'dashboard'],
  FINANCE_OFFICER:        ['budget', 'expenses', 'contributions', 'events', 'dashboard'],
  COMMUNICATIONS_OFFICER: ['sms', 'incidents', 'events', 'dashboard'],
  BRAND_MANAGER:          ['materials', 'designs', 'orders', 'outdoor', 'media', 'dashboard'],
  CAMPAIGN_VOLUNTEER:     ['tasks', 'events'],
};

// Paths that bypass all role checks (health, webhooks, catalogue)
const BYPASS_PATHS = [
  '/health',
  '/metrics',
  '/webhooks/',
  '/materials/categories',
  '/materials/types',
  '/mockup-templates',
];

export interface CampaignScope {
  candidateId?:       string;
  wardCode?:          string;
  constituencyCode?:  string;
  allowedModules?:    string[];
}

@Injectable()
export class CampaignRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      method:  string;
      url:     string;
      headers: Record<string, string | undefined>;
      params:  Record<string, string>;
      campaignScope?: CampaignScope;
    }>();

    const path = req.url.split('?')[0] ?? req.url;

    // Bypass role checks for public/internal paths
    if (BYPASS_PATHS.some((bp) => path.startsWith(bp))) {
      return true;
    }

    const role          = (req.headers['x-user-role']          ?? '').toUpperCase();
    const tenantId      = req.headers['x-tenant-id']           ?? '';
    const userId        = req.headers['x-user-id']             ?? '';
    const wardCode      = req.headers['x-ward-code']           ?? '';
    const consCode      = req.headers['x-constituency-code']   ?? '';
    const candidateId   = req.headers['x-candidate-id']        ?? '';
    const platformAdmin = req.headers['x-platform-admin']      ?? '';

    // Platform Super Admin bypass — x-platform-admin: true skips all role checks
    // The header is only injected by API Gateway from a verified JWT claim
    if (platformAdmin === 'true') return true;

    if (!tenantId) throw new ForbiddenException('X-Tenant-Id header is required');
    if (!role)     throw new ForbiddenException('X-User-Role header is required');

    // ── Full access roles ─────────────────────────────────────
    if (FULL_ACCESS_ROLES.has(role)) return true;

    // ── Candidate-scoped roles ────────────────────────────────
    if (CANDIDATE_ROLES.has(role)) {
      req.campaignScope = { candidateId: candidateId || userId };
      return true;
    }

    // ── Geography-scoped roles ────────────────────────────────
    if (GEO_SCOPED_ROLES.has(role)) {
      req.campaignScope = {
        wardCode:        wardCode  || undefined,
        constituencyCode: consCode || undefined,
      };
      return true;
    }

    // ── Limited module roles ──────────────────────────────────
    if (LIMITED_ROLES[role]) {
      const allowedModules = LIMITED_ROLES[role];
      // Extract path segment after /campaigns/:id/
      const pathAfterCampaign = path.replace(/^\/campaigns\/[^/]+\//, '');
      const moduleSeg = pathAfterCampaign.split('/')[0] ?? '';

      // Allow root campaign path (GET /campaigns/:id is always allowed for context)
      const isDashboard = path.endsWith('/dashboard') || moduleSeg === '';

      if (!isDashboard && moduleSeg && !allowedModules.includes(moduleSeg)) {
        throw new ForbiddenException(
          `Role ${role} does not have access to module '${moduleSeg}'. ` +
          `Allowed: [${allowedModules.join(', ')}]`,
        );
      }
      req.campaignScope = { allowedModules };
      return true;
    }

    throw new ForbiddenException(
      `Role '${role}' is not permitted to access campaign endpoints`,
    );
  }
}
