// ============================================================
// VoteCapsule — Audit Controller
// services/audit/src/audit.controller.ts
//
// REST endpoints for audit logs, access logs, compliance reports.
// ============================================================
import {
  Controller, Get, Post, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { CreateComplianceReportDto } from './dto/create-compliance-report.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Controller('audit')
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  // ── POST /audit/logs — Create audit log ─────────────────────

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  async createLog(@Body() dto: CreateAuditLogDto) {
    return this.auditService.createLog(dto);
  }

  // ── GET /audit/logs — Query with filters ────────────────────

  @Get('logs')
  async findLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findLogs(query);
  }

  // ── GET /audit/logs/:id — Get single log ────────────────────

  @Get('logs/:id')
  async getLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.getLogById(id);
  }

  // ── GET /audit/logs/resource/:type/:id — Logs by resource ───

  @Get('logs/resource/:type/:id')
  async getLogsByResource(
    @Param('type') resourceType: string,
    @Param('id') resourceId: string,
  ) {
    return this.auditService.getLogsByResource(resourceType, resourceId);
  }

  // ── GET /audit/stats/:serviceName — Stats grouped by action ─

  @Get('stats/:serviceName')
  async getStatsByService(
    @Param('serviceName') serviceName: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getStatsByService(serviceName, { dateFrom, dateTo });
  }

  // ── POST /audit/access-logs — Create access log ─────────────

  @Post('access-logs')
  @HttpCode(HttpStatus.CREATED)
  async createAccessLog(@Body() dto: CreateAccessLogDto) {
    return this.auditService.createAccessLog(dto);
  }

  // ── POST /audit/compliance-reports — Generate report ────────

  @Post('compliance-reports')
  @HttpCode(HttpStatus.CREATED)
  async generateComplianceReport(@Body() dto: CreateComplianceReportDto) {
    return this.auditService.generateComplianceReport(dto);
  }

  // ── GET /audit/compliance-reports — List reports ─────────────

  @Get('compliance-reports')
  async findComplianceReports(
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findComplianceReports(tenantId, page, limit);
  }

  // ── GET /health — Health check ──────────────────────────────

  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'audit',
      timestamp: new Date().toISOString(),
    };
  }
}
