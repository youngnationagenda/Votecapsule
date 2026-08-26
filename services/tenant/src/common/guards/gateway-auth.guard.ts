/**
 * Vote Capsule™ — GatewayAuthGuard (Tenant Service)
 *
 * Replaces JwtAuthGuard on all Tenant Service controllers.
 *
 * WHY: The API Gateway Lambda Authorizer already validates Cognito RS256 tokens
 * and injects verified claims as x-* headers. Re-validating with a local HS256
 * JWT_SECRET ALWAYS FAILS because portals send Cognito RS256 ID tokens.
 *
 * HOW: Verifies x-user-id header is present (only injected by Lambda Authorizer
 * after successful Cognito token verification). Populates req.user from x-* headers
 * so RolesGuard + route handlers work unchanged.
 *
 * SECURITY: API Gateway + Lambda Authorizer is the security boundary.
 * Direct ALB access (bypassing Gateway) is blocked by VPC security groups.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface GatewayUser {
  sub:              string;
  id:               string;
  email:            string;
  roles:            string[];
  tenantId:         string;
  wardCode:         string;
  constituencyCode: string;
  candidateId:      string;
  platformAdmin:    boolean;
}

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: GatewayUser }>();

    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new UnauthorizedException(
        'x-user-id header missing — request must be routed through API Gateway',
      );
    }

    // Parse role(s) from header
    const roleHeader = (req.headers['x-user-role'] as string | undefined) ?? '';
    let roles: string[] = [];
    try {
      const parsed = JSON.parse(roleHeader);
      roles = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      roles = roleHeader ? [roleHeader] : [];
    }

    // Hydrate req.user for RolesGuard + controllers
    req.user = {
      sub:              userId,
      id:               userId,
      email:            (req.headers['x-user-email'] as string | undefined) ?? '',
      roles,
      tenantId:         (req.headers['x-tenant-id']          as string | undefined) ?? '',
      wardCode:         (req.headers['x-ward-code']          as string | undefined) ?? '',
      constituencyCode: (req.headers['x-constituency-code']  as string | undefined) ?? '',
      candidateId:      (req.headers['x-candidate-id']       as string | undefined) ?? '',
      platformAdmin:    (req.headers['x-platform-admin']     as string | undefined) === 'true',
    };

    return true;
  }
}
