/**
 * Vote Capsule™ Roles Guard
 *
 * Enforces role-based access control on routes.
 * Use with @Roles() decorator.
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '@vote-capsule/types';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload & { platformAdmin?: boolean };
      headers?: Record<string, string | undefined>;
    }>();

    // Platform super admin bypasses all role checks
    if (
      request.user?.platformAdmin === true ||
      request.headers?.['x-platform-admin'] === 'true'
    ) {
      return true;
    }

    const user = request.user;
    if (!user?.roles) {
      return false;
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
