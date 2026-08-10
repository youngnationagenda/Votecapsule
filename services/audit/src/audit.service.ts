// ============================================================
// VoteCapsule — Audit Service — Core Audit Logic
// services/audit/src/audit.service.ts
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditLogStatus } from './entities/audit-log.entity';
import { AccessLog } from './entities/access-log.entity';
import { ComplianceReport } from './entities/compliance-report.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { CreateComplianceReportDto } from './dto/create-compliance-report.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,

    @InjectRepository(AccessLog)
    private readonly accessLogRepo: Repository<AccessLog>,

    @InjectRepository(ComplianceReport)
    private readonly complianceReportRepo: Repository<ComplianceReport>,
  ) {}

  // ── Create Audit Log ──────────────────────────────────────────

  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditLogRepo.create(dto);
    const saved = await this.auditLogRepo.save(log);
    this.logger.debug(`Audit log created: ${saved.id} [${saved.action}]`);
    return saved;
  }

  // ── Query Audit Logs (paginated, filtered) ────────────────────

  async findLogs(query: QueryAuditLogsDto): Promise<PaginatedResponse<AuditLog>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.serviceName) where.serviceName = query.serviceName;
    if (query.status) where.status = query.status as AuditLog['status'];

    // Date range filter via query builder for more control
    const qb = this.auditLogRepo.createQueryBuilder('log');
    qb.where(where);

    if (query.dateFrom) {
      qb.andWhere('log.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('log.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  // ── Get Single Log ────────────────────────────────────────────

  async getLogById(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }

  // ── Get Logs by Resource ──────────────────────────────────────

  async getLogsByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Stats by Service ──────────────────────────────────────────

  async getStatsByService(
    serviceName: string,
    dateRange?: { dateFrom?: string; dateTo?: string },
  ): Promise<{ action: string; count: number }[]> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.service_name = :serviceName', { serviceName })
      .groupBy('log.action')
      .orderBy('count', 'DESC');

    if (dateRange?.dateFrom) {
      qb.andWhere('log.created_at >= :dateFrom', { dateFrom: dateRange.dateFrom });
    }
    if (dateRange?.dateTo) {
      qb.andWhere('log.created_at <= :dateTo', { dateTo: dateRange.dateTo });
    }

    return qb.getRawMany();
  }

  // ── Create Access Log ─────────────────────────────────────────

  async createAccessLog(dto: CreateAccessLogDto): Promise<AccessLog> {
    const log = this.accessLogRepo.create(dto);
    return this.accessLogRepo.save(log);
  }

  // ── Generate Compliance Report ────────────────────────────────

  async generateComplianceReport(dto: CreateComplianceReportDto): Promise<ComplianceReport> {
    const report = this.complianceReportRepo.create({
      ...dto,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
    });
    const saved = await this.complianceReportRepo.save(report);
    this.logger.log(`Compliance report generated: ${saved.id} [${saved.reportType}]`);
    return saved;
  }

  // ── List Compliance Reports ───────────────────────────────────

  async findComplianceReports(
    tenantId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ComplianceReport>> {
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<ComplianceReport> = {};
    if (tenantId) where.tenantId = tenantId;

    const [data, total] = await this.complianceReportRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ── Security Summary (KPI counts for the Security page) ──────
  //
  // Returns aggregate counts across audit_logs in the given time
  // window — auth failures, access denials, high-risk deletions —
  // plus per-service error rates, and top suspicious IPs.
  // Designed for the Admin portal Security page KPI cards.

  async getSecuritySummary(dateFrom?: string, dateTo?: string): Promise<{
    window: { from: string; to: string };
    totalRequests: number;
    authFailures: number;
    accessDenied: number;
    errorCount: number;
    highRiskDeletions: number;
    topSuspiciousIps: { ipAddress: string; count: number }[];
    serviceErrorRates: { serviceName: string; total: number; failures: number; rate: number }[];
  }> {
    const windowFrom = dateFrom ?? new Date(Date.now() - 86_400_000).toISOString();
    const windowTo   = dateTo   ?? new Date().toISOString();

    const qb = this.auditLogRepo.createQueryBuilder('log')
      .where('log.created_at >= :from', { from: windowFrom })
      .andWhere('log.created_at <= :to',   { to: windowTo });

    const allLogs = await qb.getMany();

    const totalRequests    = allLogs.length;
    const authFailureActions = new Set([
      'LOGIN_FAILURE', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'UNAUTHORIZED',
      'PASSWORD_RESET_FORCED', 'MFA_FAILURE',
    ]);

    let authFailures       = 0;
    let accessDenied       = 0;
    let errorCount         = 0;
    let highRiskDeletions  = 0;

    const ipCounts: Record<string, number>  = {};
    const svcMap:   Record<string, { total: number; failures: number }> = {};

    for (const log of allLogs) {
      const action = (log.action ?? '').toUpperCase();
      const status = log.status;
      const method = (log.method ?? '').toUpperCase();

      // Auth failures
      if (
        status === AuditLogStatus.FAILURE &&
        (action.includes('LOGIN') || action.includes('TOKEN') ||
         action.includes('AUTH')  || authFailureActions.has(action))
      ) {
        authFailures++;
      }

      // Access denied
      if (status === AuditLogStatus.DENIED) accessDenied++;

      // General errors
      if (status === AuditLogStatus.ERROR || status === AuditLogStatus.FAILURE) errorCount++;

      // High-risk deletions
      if (method === 'DELETE' && status === AuditLogStatus.SUCCESS) highRiskDeletions++;

      // IP counts (for critical only)
      if (
        (status === AuditLogStatus.DENIED || status === AuditLogStatus.FAILURE) &&
        log.ipAddress
      ) {
        ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] ?? 0) + 1;
      }

      // Per-service stats
      const svc = log.serviceName ?? 'unknown';
      if (!svcMap[svc]) svcMap[svc] = { total: 0, failures: 0 };
      svcMap[svc].total++;
      if (status !== AuditLogStatus.SUCCESS) svcMap[svc].failures++;
    }

    const topSuspiciousIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ipAddress, count]) => ({ ipAddress, count }));

    const serviceErrorRates = Object.entries(svcMap)
      .map(([serviceName, { total, failures }]) => ({
        serviceName,
        total,
        failures,
        rate: total > 0 ? Math.round((failures / total) * 100) : 0,
      }))
      .sort((a, b) => b.failures - a.failures);

    return {
      window: { from: windowFrom, to: windowTo },
      totalRequests,
      authFailures,
      accessDenied,
      errorCount,
      highRiskDeletions,
      topSuspiciousIps,
      serviceErrorRates,
    };
  }

  // ── Security-filtered audit logs (for the event feed) ────────
  //
  // Returns the last `limit` audit logs with status failure|denied|error,
  // OR with high-risk HTTP methods (DELETE), ordered newest first.
  // Used by the Security page event feed — avoids returning all 200 logs.

  async findSecurityLogs(
    dateFrom?: string,
    dateTo?:   string,
    limit = 200,
  ): Promise<AuditLog[]> {
    const windowFrom = dateFrom ?? new Date(Date.now() - 86_400_000).toISOString();
    const windowTo   = dateTo   ?? new Date().toISOString();

    const [failureLogs, deletionLogs] = await Promise.all([
      // Failures + denials
      this.auditLogRepo.createQueryBuilder('log')
        .where('log.status IN (:...statuses)', {
          statuses: [AuditLogStatus.FAILURE, AuditLogStatus.DENIED, AuditLogStatus.ERROR],
        })
        .andWhere('log.created_at >= :from', { from: windowFrom })
        .andWhere('log.created_at <= :to',   { to: windowTo })
        .orderBy('log.created_at', 'DESC')
        .take(limit)
        .getMany(),

      // Successful DELETEs (high-risk operations)
      this.auditLogRepo.createQueryBuilder('log')
        .where('log.method = :method', { method: 'DELETE' })
        .andWhere('log.status = :status', { status: AuditLogStatus.SUCCESS })
        .andWhere('log.created_at >= :from', { from: windowFrom })
        .andWhere('log.created_at <= :to',   { to: windowTo })
        .orderBy('log.created_at', 'DESC')
        .take(50)
        .getMany(),
    ]);

    // Merge, deduplicate, sort newest first
    const seen = new Set<string>();
    const merged: AuditLog[] = [];
    for (const log of [...failureLogs, ...deletionLogs]) {
      if (!seen.has(log.id)) {
        seen.add(log.id);
        merged.push(log);
      }
    }
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged.slice(0, limit);
  }
}
