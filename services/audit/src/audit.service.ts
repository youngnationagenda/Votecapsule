// ============================================================
// VoteCapsule — Audit Service — Core Audit Logic
// services/audit/src/audit.service.ts
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
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
}
