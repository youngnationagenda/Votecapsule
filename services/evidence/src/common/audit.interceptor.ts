// ============================================================
// VoteCapsule — Audit Interceptor
// services/{service}/src/common/audit.interceptor.ts
//
// Fires an audit log entry to the Audit Service after every
// HTTP request. Fire-and-forget — never blocks the response.
// Skips health check and metrics endpoints.
// ============================================================
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as http from 'node:http';
import * as https from 'node:https';

const SKIP_PATHS = new Set(['/health', '/metrics', '/favicon.ico']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly auditServiceUrl: string;
  private readonly serviceName: string;

  constructor(private readonly config: ConfigService) {
    this.auditServiceUrl = this.config.get<string>(
      'AUDIT_SERVICE_URL',
      'http://localhost:3012/api/v1/audit',
    );
    this.serviceName = this.config.get<string>('SERVICE_NAME', 'unknown-service');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Safety: never fire if this service IS the Audit Service (prevents self-loop)
    if (this.serviceName === 'audit-service') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      user?: { sub?: string; tenantId?: string };
    }>();

    const { method, url } = req;

    // Strip query string for path matching
    const path = url.split('?')[0] ?? url;

    // Skip health / internal endpoints
    if (SKIP_PATHS.has(path) || path.endsWith('/health')) {
      return next.handle();
    }

    const startMs = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startMs;
          this.fireAuditLog({
            method,
            endpoint: path,
            status:   'SUCCESS',
            durationMs,
            userId:   req.user?.sub,
            tenantId: req.user?.tenantId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
          });
        },
        error: (err: { status?: number; message?: string }) => {
          const durationMs = Date.now() - startMs;
          this.fireAuditLog({
            method,
            endpoint:     path,
            status:       'FAILURE',
            durationMs,
            userId:       req.user?.sub,
            tenantId:     req.user?.tenantId,
            ipAddress:    req.ip,
            userAgent:    req.headers['user-agent'] as string | undefined,
            errorCode:    String(err?.status ?? 500),
            errorMessage: err?.message,
          });
        },
      }),
    );
  }

  private fireAuditLog(opts: {
    method:        string;
    endpoint:      string;
    status:        'SUCCESS' | 'FAILURE';
    durationMs:    number;
    userId?:       string;
    tenantId?:     string;
    ipAddress?:    string;
    userAgent?:    string;
    errorCode?:    string;
    errorMessage?: string;
  }): void {
    const payload = JSON.stringify({
      serviceName:  this.serviceName,
      action:       `${opts.method} ${opts.endpoint}`,
      resourceType: 'HTTP_REQUEST',
      method:       opts.method,
      endpoint:     opts.endpoint,
      status:       opts.status,
      durationMs:   opts.durationMs,
      userId:       opts.userId  ?? null,
      tenantId:     opts.tenantId ?? null,
      ipAddress:    opts.ipAddress ?? null,
      userAgent:    opts.userAgent ?? null,
      errorCode:    opts.errorCode ?? null,
      errorMessage: opts.errorMessage ?? null,
    });

    try {
      const url = new URL(`${this.auditServiceUrl}/logs`);
      const transport = url.protocol === 'https:' ? https : http;

      const req = transport.request(
        {
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname,
          method:   'POST',
          headers:  {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'x-internal-service': this.serviceName,
          },
        },
        (res) => { res.resume(); }, // drain response body
      );

      req.on('error', (err) => {
        // Silently swallow — audit logging must never crash the service
        this.logger.debug(`Audit log fire failed: ${err.message}`);
      });

      req.write(payload);
      req.end();
    } catch (err) {
      this.logger.debug(`Audit interceptor error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
