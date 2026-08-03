// ============================================================
// VoteCapsule — Reconciliation Controller
// services/evidence/src/reconciliation/reconciliation.controller.ts
//
// REST endpoints for the Form B collation and reconciliation engine.
// All routes are under: /api/v1/evidence/reconciliation
// ============================================================
import {
  Controller, Post, Get, Patch, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, Headers, Logger,
  BadRequestException,
} from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { FormBSubmitDto }        from './dto/form-b-submit.dto';

@Controller('reconciliation')
export class ReconciliationController {
  private readonly logger = new Logger(ReconciliationController.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  // ── POST /reconciliation/form-b ────────────────────────────
  /**
   * Returning Officer submits a Form B collation record.
   * Automatically triggers reconciliation against all Form As
   * for the same election + position + constituency.
   *
   * Headers:
   *   X-Operator-Id: UUID of the authenticated Returning Officer
   */
  @Post('form-b')
  @HttpCode(HttpStatus.CREATED)
  async submitFormB(
    @Body() dto: FormBSubmitDto,
    @Headers('x-operator-id') operatorId: string,
  ) {
    this.logger.log(
      `Form B submitted by ${operatorId ?? 'unknown'} — ` +
      `election ${dto.electionId}, position ${dto.positionCode}`,
    );
    return this.reconciliationService.submitFormB(dto);
  }

  // ── POST /reconciliation/form-b/:id/reconcile ──────────────
  /**
   * Re-trigger reconciliation for an existing Form B.
   * Useful after additional Form As have been approved/anchored.
   */
  @Post('form-b/:id/reconcile')
  async reconcileFormB(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Manual reconciliation triggered for Form B ${id}`);
    return this.reconciliationService.reconcileFormB(id);
  }

  // ── GET /reconciliation/form-b ─────────────────────────────
  /**
   * List Form Bs for an election with optional filtering.
   *
   * Query params:
   *   electionId (required)
   *   positionCode — filter by PRESIDENT | MP | MCA | GOVERNOR | SENATOR | WOMEN_REP
   *   status — DRAFT | SUBMITTED | VERIFIED | DECLARED
   *   reconciliationStatus — MATCHED | DISCREPANCY | PENDING | AWAITING_FORMS
   *   limit, offset — pagination
   */
  @Get('form-b')
  async listFormBs(
    @Query('electionId') electionId: string,
    @Query('positionCode') positionCode?: string,
    @Query('status') status?: string,
    @Query('reconciliationStatus') reconciliationStatus?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!electionId) {
      throw new BadRequestException('electionId query parameter is required');
    }
    return this.reconciliationService.listFormBs({
      electionId,
      positionCode,
      status,
      reconciliationStatus,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ── GET /reconciliation/form-b/:id ─────────────────────────
  /**
   * Get a single Form B with its candidates and all reconciliation alerts.
   */
  @Get('form-b/:id')
  async getFormB(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.getFormBDetail(id);
  }

  // ── GET /reconciliation/form-b/:id/missing-stations ────────
  /**
   * Returns polling stations in the Form B's scope that have NOT
   * yet submitted a valid (APPROVED/ANCHORED/PUBLISHED) Form A.
   */
  @Get('form-b/:id/missing-stations')
  async getMissingStations(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.getMissingFormAs(id);
  }

  // ── GET /reconciliation/alerts ─────────────────────────────
  /**
   * List open reconciliation alerts.
   *
   * Query params:
   *   electionId (required)
   *   severity — HIGH | MEDIUM | LOW
   *   status — OPEN | UNDER_REVIEW | RESOLVED | DISMISSED
   *   positionCode
   *   limit, offset
   */
  @Get('alerts')
  async listAlerts(
    @Query('electionId') electionId: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('positionCode') positionCode?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!electionId) {
      throw new BadRequestException('electionId query parameter is required');
    }
    return this.reconciliationService.listAlerts({
      electionId,
      severity,
      status,
      positionCode,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ── PATCH /reconciliation/alerts/:id/resolve ───────────────
  /**
   * Resolve or dismiss a reconciliation alert.
   * Only Senior Returning Officers / IEBC Authority users should call this.
   *
   * Body:
   *   action: 'RESOLVED' | 'DISMISSED'
   *   resolutionNotes: string (required — audit trail)
   *
   * Headers:
   *   X-Operator-Id: UUID of the resolving officer
   */
  @Patch('alerts/:id/resolve')
  async resolveAlert(
    @Param('id', ParseUUIDPipe) alertId: string,
    @Body() body: { action: 'RESOLVED' | 'DISMISSED'; resolutionNotes: string },
    @Headers('x-operator-id') operatorId: string,
  ) {
    if (!body.action || !['RESOLVED', 'DISMISSED'].includes(body.action)) {
      throw new BadRequestException('action must be RESOLVED or DISMISSED');
    }
    if (!body.resolutionNotes?.trim()) {
      throw new BadRequestException('resolutionNotes is required for audit purposes');
    }
    if (!operatorId) {
      throw new BadRequestException('X-Operator-Id header is required');
    }

    this.logger.log(`Alert ${alertId} being ${body.action} by operator ${operatorId}`);

    await this.reconciliationService.resolveAlert(
      alertId,
      operatorId,
      body.resolutionNotes,
      body.action,
    );

    return { message: `Alert ${alertId} ${body.action} successfully` };
  }

  // ── GET /reconciliation/summary/:electionId ────────────────
  /**
   * Dashboard summary: Form B counts by reconciliation status,
   * grouped by position. Used by the Authority portal.
   */
  @Get('summary/:electionId')
  async getSummary(@Param('electionId', ParseUUIDPipe) electionId: string) {
    return this.reconciliationService.getReconciliationSummary(electionId);
  }

  // ══════════════════════════════════════════════════════════
  //  FORM C — County/National Declaration Reconciliation
  //
  //  LEVEL 3: Form C (county level) vs SUM(Form Bs in county)
  //    - GOVERNOR 37C, SENATOR 38C, WOMEN_REP 39C
  //
  //  LEVEL 4: Form 34C (national) vs SUM(all 34Bs nationally)
  //    - PRESIDENT only
  //
  //  Rule enforced: Form C total_valid_votes MUST equal the
  //  sum of all Form B valid_votes for that position/county.
  //  Per-candidate totals must also reconcile.
  // ══════════════════════════════════════════════════════════

  /**
   * POST /reconciliation/form-c
   * Submit a Form C declaration and automatically reconcile it
   * against all Form Bs in scope.
   *
   * Positions that use Form C:
   *   PRESIDENT  → Form 34C (national — county_code: null)
   *   GOVERNOR   → Form 37C (county level)
   *   SENATOR    → Form 38C (county level)
   *   WOMEN_REP  → Form 39C (county level)
   *
   * Note: MP (Form 35B) and MCA (Form 36B) declare at constituency/ward
   * level — they have no Form C. Submitting 35B/36B is the final step.
   */
  @Post('form-c')
  @HttpCode(HttpStatus.CREATED)
  async submitFormC(@Body() dto: FormCSubmitDto) {
    const result = await this.reconciliationService.submitAndReconcileFormC(dto);
    return {
      formCId:         result.formCId,
      reconciliation:  result.reconciliation,
      message:
        result.reconciliation.status === 'MATCHED'
          ? '✅ Form C reconciles with all Form Bs — ready for declaration'
          : `⚠️  ${result.reconciliation.alerts.length} discrepancy alert(s) created — review before declaration`,
    };
  }

  /**
   * POST /reconciliation/form-c/:id/reconcile
   * Re-trigger Form C reconciliation (e.g. after a Form B correction).
   */
  @Post('form-c/:id/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcileFormC(@Param('id', ParseUUIDPipe) formCId: string) {
    return this.reconciliationService.reconcileFormC(formCId);
  }

  /**
   * GET /reconciliation/form-c/summary/:electionId
   * Returns Form C reconciliation status across all counties and positions.
   * Shows: position, county, status (VERIFIED/DISCREPANCY/DRAFT), open alerts.
   */
  @Get('form-c/summary/:electionId')
  async getFormCSummary(@Param('electionId', ParseUUIDPipe) electionId: string) {
    return this.reconciliationService.getFormCReconciliationSummary(electionId);
  }
}
