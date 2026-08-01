// ============================================================
// VoteCapsule™ — Reporting Controller
// reporting-service/src/reporting.controller.ts
//
// REST API for result aggregation, publication, and exports.
//
// Role-based visibility:
//   ELECTION_AUTHORITY  — full access (DRAFT + VERIFIED + PUBLISHED)
//   OBSERVER / MEDIA    — VERIFIED + PUBLISHED only
//   PUBLIC              — PUBLISHED only (no auth required)
//
// AI ASSISTS, HUMANS DECIDE — publication requires human action.
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  Headers, HttpCode, HttpStatus, ParseUUIDPipe,
  BadRequestException, Logger, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportingService }      from './reporting.service';
import { ComputeSnapshotDto }    from './dto/compute-snapshot.dto';
import { PublishResultsDto }     from './dto/publish-results.dto';
import { ExportRequestDto }      from './dto/export-request.dto';
import { ScopeLevel, PublicationStatus } from './entities/result-snapshot.entity';
import { ExportFormat }          from './entities/export-log.entity';

@Controller('reports')
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(private readonly service: ReportingService) {}

  // ══════════════════════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════════════════════

  /**
   * GET /reports/dashboard
   * Election Authority dashboard — overview + per-position + county coverage.
   * Query: electionYear
   * Header: X-Tenant-Id
   */
  @Get('dashboard')
  async getDashboard(
    @Query('electionYear') electionYear: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId)    throw new BadRequestException('X-Tenant-Id header is required');
    if (!electionYear) throw new BadRequestException('electionYear query param is required');
    return this.service.getDashboard(tenantId, parseInt(electionYear, 10));
  }

  // ══════════════════════════════════════════════════════════
  //  SNAPSHOTS
  // ══════════════════════════════════════════════════════════

  /**
   * POST /reports/snapshots/compute
   * Trigger (re)computation of result snapshots.
   * Reads directly from evidence_capsules + ai_verification_jobs.
   * Header: X-Tenant-Id, X-Election-Id (optional)
   */
  @Post('snapshots/compute')
  @HttpCode(HttpStatus.OK)
  async computeSnapshots(
    @Body() dto: ComputeSnapshotDto,
    @Headers('x-tenant-id')   tenantId:   string,
    @Headers('x-election-id') electionId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.computeSnapshots(dto, tenantId, electionId || undefined);
  }

  /**
   * GET /reports/snapshots
   * List snapshots with filters.
   * Query: electionYear, positionCode, scopeLevel, countyCode,
   *        constituencyCode, publicationStatus
   * Header: X-Tenant-Id
   */
  @Get('snapshots')
  async listSnapshots(
    @Headers('x-tenant-id')        tenantId:          string,
    @Query('electionYear')         electionYear?:     string,
    @Query('positionCode')         positionCode?:     string,
    @Query('scopeLevel')           scopeLevel?:       string,
    @Query('countyCode')           countyCode?:       string,
    @Query('constituencyCode')     constituencyCode?: string,
    @Query('publicationStatus')    pubStatus?:        string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.listSnapshots({
      tenantId,
      electionYear:      electionYear     ? parseInt(electionYear, 10) : undefined,
      positionCode,
      scopeLevel:        scopeLevel       as ScopeLevel | undefined,
      countyCode,
      constituencyCode,
      publicationStatus: pubStatus        as PublicationStatus | undefined,
    });
  }

  /**
   * GET /reports/snapshots/:id
   */
  @Get('snapshots/:id')
  async getSnapshot(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSnapshot(id);
  }

  /**
   * PATCH /reports/snapshots/:id/verify
   * Election Authority marks snapshot as VERIFIED — ready for publication.
   * Header: X-User-Id
   */
  @Patch('snapshots/:id/verify')
  async verifySnapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.verifySnapshot(id, userId);
  }

  // ══════════════════════════════════════════════════════════
  //  RESULTS
  // ══════════════════════════════════════════════════════════

  /**
   * GET /reports/results
   * Returns snapshots visible to the caller's role.
   * Query: electionYear, positionCode, scopeLevel, countyCode,
   *        constituencyCode, publishedOnly
   * Header: X-Tenant-Id (optional for published-only calls)
   */
  @Get('results')
  async getResults(
    @Headers('x-tenant-id')        tenantId:          string,
    @Query('electionYear')         electionYear?:     string,
    @Query('positionCode')         positionCode?:     string,
    @Query('scopeLevel')           scopeLevel?:       string,
    @Query('countyCode')           countyCode?:       string,
    @Query('constituencyCode')     constituencyCode?: string,
    @Query('publishedOnly')        publishedOnly?:    string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.listSnapshots({
      tenantId,
      electionYear:      electionYear ? parseInt(electionYear, 10) : undefined,
      positionCode,
      scopeLevel:        scopeLevel   as ScopeLevel | undefined,
      countyCode,
      constituencyCode,
      publicOnly:        publishedOnly === 'true',
    });
  }

  /**
   * GET /reports/public/results
   * PUBLISHED results only — no authentication required.
   * Called by the public portal.
   * Query: electionYear (required), positionCode (required),
   *        scopeLevel, countyCode
   */
  @Get('public/results')
  async getPublicResults(
    @Query('electionYear') electionYear: string,
    @Query('positionCode') positionCode: string,
    @Query('scopeLevel')   scopeLevel?:  string,
    @Query('countyCode')   countyCode?:  string,
  ) {
    if (!electionYear)  throw new BadRequestException('electionYear is required');
    if (!positionCode)  throw new BadRequestException('positionCode is required');
    return this.service.getPublicResults({
      electionYear: parseInt(electionYear, 10),
      positionCode,
      scopeLevel:   scopeLevel as ScopeLevel | undefined,
      countyCode,
    });
  }

  /**
   * GET /reports/public/progress
   * Nation-wide reporting progress — no authentication required.
   * Called by the Public Transparency Portal's Progress page.
   *
   * Returns total/reported station counts nationally and per county.
   * Defaults to the most recent PUBLISHED election.
   * Query (all optional): electionYear, positionCode
   */
  @Get('public/progress')
  async getPublicProgress(
    @Query('electionYear') electionYear?: string,
    @Query('positionCode') positionCode?: string,
  ) {
    return this.service.getPublicProgress({
      electionYear: electionYear ? parseInt(electionYear, 10) : undefined,
      positionCode,
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PUBLICATION
  // ══════════════════════════════════════════════════════════

  /**
   * POST /reports/publish
   * Officially publish election results.
   * Requires VERIFIED snapshot. Creates immutable Publication record.
   * AI ASSISTS, HUMANS DECIDE.
   * Header: X-User-Id, X-User-Name (optional)
   */
  @Post('publish')
  @HttpCode(HttpStatus.CREATED)
  async publishResults(
    @Body() dto: PublishResultsDto,
    @Headers('x-user-id')   userId:   string,
    @Headers('x-user-name') userName: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.publishResults(dto, userId, userName || undefined);
  }

  // ══════════════════════════════════════════════════════════
  //  ANALYTICS
  // ══════════════════════════════════════════════════════════

  /**
   * GET /reports/analytics
   * Coverage trends, flagged stations, anomaly hotspots.
   * Query: electionYear
   * Header: X-Tenant-Id
   */
  @Get('analytics')
  async getAnalytics(
    @Query('electionYear') electionYear: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId)    throw new BadRequestException('X-Tenant-Id header is required');
    if (!electionYear) throw new BadRequestException('electionYear query param is required');
    return this.service.getAnalytics(tenantId, parseInt(electionYear, 10));
  }

  // ══════════════════════════════════════════════════════════
  //  EXPORTS
  // ══════════════════════════════════════════════════════════

  /**
   * GET /reports/exports/csv
   * Synchronous CSV export — streams directly to client.
   * Query: electionYear, positionCode, scopeLevel, countyCode,
   *        constituencyCode, publishedOnly
   * Header: X-Tenant-Id, X-User-Id
   */
  @Get('exports/csv')
  async exportCsv(
    @Res() res: Response,
    @Headers('x-tenant-id') tenantId:  string,
    @Headers('x-user-id')   userId:    string,
    @Query('electionYear')  electionYear:     string,
    @Query('positionCode')  positionCode:     string,
    @Query('scopeLevel')    scopeLevel?:      string,
    @Query('countyCode')    countyCode?:      string,
    @Query('publishedOnly') publishedOnly?:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    if (!electionYear || !positionCode) {
      throw new BadRequestException('electionYear and positionCode are required');
    }

    const { csv, logId } = await this.service.exportCsv(
      {
        format:        ExportFormat.CSV,
        electionYear:  parseInt(electionYear, 10),
        positionCode,
        scopeLevel:    scopeLevel as ScopeLevel | undefined,
        countyCode,
        publishedOnly: publishedOnly === 'true',
      },
      tenantId,
      userId,
    );

    const filename = `votecapsule-results-${positionCode}-${electionYear}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Log-Id', logId);
    res.send(csv);
  }

  /**
   * POST /reports/exports
   * Request async PDF or Excel export.
   * Returns export log ID; poll GET /reports/exports/:id for completion.
   * Header: X-Tenant-Id, X-User-Id
   */
  @Post('exports')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestExport(
    @Body() dto: ExportRequestDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    return this.service.requestAsyncExport(dto, tenantId, userId);
  }

  /**
   * GET /reports/exports/:id
   * Poll status of an async export (PDF, Excel).
   */
  @Get('exports/:id')
  async getExportStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getExportLog(id);
  }

  // ══════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════

  /**
   * GET /reports/stats
   * Summary counts for Admin Portal dashboard widget.
   * Header: X-Tenant-Id
   */
  @Get('stats')
  async getStats(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.getStats(tenantId);
  }
}
