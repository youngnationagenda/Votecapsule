// ============================================================
// VoteCapsule — Subscription Guard
// services/identity/src/common/subscription.guard.ts
//
// Verifies the requesting tenant has an active paid subscription
// before allowing guarded endpoints to proceed.
//
// Usage:
//   @UseGuards(SubscriptionGuard)        ← require active subscription
//   @SkipSubscriptionCheck()             ← opt-out on specific routes
//
// Tenant ID is resolved from (in priority order):
//   1. req.user.tenantId  (JWT payload)
//   2. req.body.tenantId
//   3. req.params.tenantId
//   4. req.query.tenantId
//
// If no tenantId is found, the request is ALLOWED through
// (platform-level actions like super-admin don't have a tenant).
//
// Platform tenants (FREE plan) are always allowed through —
// subscription enforcement is for paid tenant operations only.
// ============================================================
import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, Logger, SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector }     from '@nestjs/core';
import * as http  from 'node:http';
import * as https from 'node:https';

export const SKIP_SUBSCRIPTION_KEY = 'skipSubscriptionCheck';
/** Decorator — opt a route out of subscription enforcement */
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_KEY, true);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);
  private readonly billingServiceUrl: string;

  constructor(
    private readonly config:    ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.billingServiceUrl = this.config.get<string>(
      'BILLING_SERVICE_URL',
      'http://localhost:3013/api/v1/billing',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for opt-out decorator
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<{
      user?: { sub?: string; tenantId?: string; roles?: string[] };
      body?: Record<string, string>;
      params?: Record<string, string>;
      query?: Record<string, string>;
      headers?: Record<string, string | string[] | undefined>;
    }>();

    // Super admin has no tenantId — always allow
    const xTenantId = req.headers?.['x-tenant-id'];
    const headerTenantId = Array.isArray(xTenantId) ? xTenantId[0] : xTenantId;

    const tenantId =
      req.user?.tenantId ??
      headerTenantId ??
      req.body?.['tenantId'] ??
      req.params?.['tenantId'] ??
      req.query?.['tenantId'];

    if (!tenantId) {
      return true; // Platform-level action — no tenant restriction
    }

    const active = await this.checkSubscription(tenantId);

    if (!active) {
      throw new ForbiddenException(
        `Tenant ${tenantId} does not have an active subscription. ` +
        `Please upgrade at https://votecapsule.yna.co.ke/billing`,
      );
    }

    return true;
  }

  private async checkSubscription(tenantId: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        const urlStr = `${this.billingServiceUrl}/subscriptions/tenant/${tenantId}/active`;
        const url    = new URL(urlStr);
        const transport = url.protocol === 'https:' ? https : http;

        const req = transport.request(
          {
            hostname: url.hostname,
            port:     url.port || (url.protocol === 'https:' ? 443 : 80),
            path:     url.pathname,
            method:   'GET',
            headers:  { 'x-internal-service': 'identity-service' },
          },
          (res) => {
            let body = '';
            res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            res.on('end', () => {
              try {
                const data = JSON.parse(body) as { active?: boolean };
                resolve(data.active === true);
              } catch {
                // Parse error — fail open (don't block on billing outage)
                this.logger.warn(`Billing response parse error for tenant ${tenantId} — allowing through`);
                resolve(true);
              }
            });
          },
        );

        req.setTimeout(3000, () => {
          // Timeout — fail open so billing outage doesn't block the platform
          this.logger.warn(`Billing Service timeout for tenant ${tenantId} — allowing through`);
          req.destroy();
          resolve(true);
        });

        req.on('error', (err) => {
          // Network error — fail open
          this.logger.warn(`Billing Service unreachable for tenant ${tenantId}: ${err.message} — allowing through`);
          resolve(true);
        });

        req.end();
      } catch (err) {
        this.logger.warn(`SubscriptionGuard error: ${err instanceof Error ? err.message : String(err)} — allowing through`);
        resolve(true);
      }
    });
  }
}
