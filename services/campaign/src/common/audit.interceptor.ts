// ============================================================
// VoteCapsule™ — Audit Interceptor (Campaign Service)
// Identical pattern to candidate-service audit.interceptor
// ============================================================
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as http  from 'node:http';
import * as https from 'node:https';

const SKIP_PATHS = new Set(['/health', '/metrics', '/favicon.ico']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly auditServiceUrl: string;
  private readonly serviceName: string;

  constructor(private readonly config: ConfigService) {
    this.auditServiceUrl = this.config.get<string>('AUDIT_SERVICE_URL', 'http://localhost:3012/api/v1/audit');
    this.serviceName     = this.config.get<string>('SERVICE_NAME', 'campaign-service');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req  = context.switchToHttp().getRequest<{ method: string; url: string; ip?: string; headers: Record<string, string | string[] | undefined>; user?: { sub?: string; tenantId?: string }; }>();
    const path = req.url.split('?')[0] ?? req.url;
    if (SKIP_PATHS.has(path) || path.endsWith('/health')) return next.handle();

    const startMs = Date.now();
    return next.handle().pipe(
      tap({
        next:  () => this.fireAuditLog({ method: req.method, endpoint: path, status: 'SUCCESS',  durationMs: Date.now() - startMs, userId: req.user?.sub, tenantId: req.user?.tenantId, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string }),
        error: (err: any) => this.fireAuditLog({ method: req.method, endpoint: path, status: 'FAILURE', durationMs: Date.now() - startMs, userId: req.user?.sub, tenantId: req.user?.tenantId, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string, errorCode: String(err?.status ?? 500), errorMessage: err?.message }),
      }),
    );
  }

  private fireAuditLog(opts: any): void {
    const payload = JSON.stringify({ serviceName: this.serviceName, action: `${opts.method} ${opts.endpoint}`, resourceType: 'HTTP_REQUEST', ...opts });
    try {
      const url = new URL(`${this.auditServiceUrl}/logs`);
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request({ hostname: url.hostname, port: url.port || 80, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'x-internal-service': this.serviceName } }, (res) => { res.resume(); });
      req.on('error', () => {});
      req.write(payload);
      req.end();
    } catch {}
  }
}
