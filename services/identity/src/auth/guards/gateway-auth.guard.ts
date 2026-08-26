/**
 * Vote Capsule™ — GatewayAuthGuard
 *
 * Replaces JwtAuthGuard on all internal Identity Service endpoints.
 *
 * WHY: The API Gateway Lambda Authorizer already validates Cognito RS256 tokens
 * and injects verified claims as x-* headers before requests reach this service.
 * Re-validating the token here with a local HS256 JWT_SECRET would ALWAYS FAIL
 * because portals send Cognito RS256 ID tokens, not internally-signed HS256 tokens.
 *
 * HOW: This guard simply verifies the x-user-id header is present (it is ONLY
 * injected by the Lambda Authorizer after a valid Cognito token is confirmed).
 * It also populates req.user from x-* headers so RolesGuard + route handlers
 * can read req.user.roles, req.user.sub, etc. exactly as before.
 *
 * SECURITY: The security boundary is the API Gateway + Lambda Authorizer.
 * Any request that reaches this service through the ALB with x-user-id set
 * has already been cryptographically verified by the authorizer.
 *
 * Direct ALB access (bypassing API Gateway) is blocked by VPC security groups.
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

    // x-user-id is ONLY present when the Lambda Authorizer verified the Cognito token.
    // If it's missing, the request bypassed API Gateway — reject it.
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new UnauthorizedException(
        'x-user-id header missing — request must be routed through API Gateway',
      );
    }

    // Parse role — Lambda authorizer injects as plain string (primary role)
    const roleHeader = (req.headers['x-user-role'] as string | undefined) ?? '';
    // Support both a single role string and a JSON array (future-proof)
    let roles: string[] = [];
    try {
      const parsed = JSON.parse(roleHeader);
      roles = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      roles = roleHeader ? [roleHeader] : [];
    }

    // Hydrate req.user so RolesGuard + controllers can read it
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
