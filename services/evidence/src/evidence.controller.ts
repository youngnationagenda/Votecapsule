// ============================================================
// VoteCapsule — Evidence Capsule Controller
// services/evidence/src/evidence.controller.ts
//
// REST API for the Evidence Capsule lifecycle.
// Matching routes are documented in V13 spec.
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UploadedFile, UseInterceptors, ParseUUIDPipe,
  HttpCode, HttpStatus, Headers, Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenceService }       from './evidence.service';
import { SubmitCapsuleDto }      from './dto/submit-capsule.dto';
import { SyncStatusDto }         from './dto/sync-status.dto';
import { ValidateDecisionDto }   from './dto/validate-decision.dto';
import { AnchorCallbackDto }     from './dto/anchor-callback.dto';
import { AiResultDto }           from './dto/ai-result.dto';
import { SubmitTallyDto }       from './dto/submit-tally.dto';
import { CapsuleStatus }         from './entities/evidence-capsule.entity';

@Controller()
export class EvidenceController {
  private readonly logger = new Logger(EvidenceController.name);

  constructor(private readonly evidenceService: EvidenceService) {}

  // ── Submit (mobile → server) ────────────────────────────────

  /**
   * POST /evidence/capsules
   * Multipart/form-data: image file + SubmitCapsuleDto fields
   *
   * Called by the React Native mobile app when a field agent
   * submits a captured evidence photo.
   *
   * Headers required:
   *   X-Agent-User-Id: UUID of the authenticated agent
   *   X-Device-Id:     UUID of the device
   */
  @Post('capsules')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async submitCapsule(
    @Body() dto: SubmitCapsuleDto,
    @UploadedFile() image: Express.Multer.File,
    @Headers('x-agent-user-id') agentUserId: string,
    @Headers('x-device-id')     deviceId:    string,
  ) {
    if (!image) {
      throw new BadRequestException('Evidence image file is required');
    }
    if (!agentUserId) {
      throw new BadRequestException('X-Agent-User-Id header is required');
    }
    if (!deviceId) {
      throw new BadRequestException('X-Device-Id header is required');
    }
    return this.evidenceService.submitCapsule(
      dto,
      image.buffer,
      agentUserId,
      deviceId,
    );
  }

  // ── Retrieval ────────────────────────────────────────────────

  /**
   * GET /evidence/capsules/:id
   * Returns a single capsule with full relations (images, hashes, custody).
   */
  @Get('capsules/:id')
  async getCapsule(@Param('id', ParseUUIDPipe) id: string) {
    return this.evidenceService.getCapsule(id);
  }

  /**
   * GET /evidence/capsules
   * Query params: stationCode, positionCode, countyCode, status
   */
  @Get('capsules')
  async listCapsules(
    @Query('stationCode') stationCode?: string,
    @Query('positionCode') positionCode?: string,
    @Query('countyCode') countyCode?: string,
    @Query('status') status?: string,
  ) {
    if (stationCode) {
      return this.evidenceService.getCapsulesByStation(stationCode, positionCode);
    }
    if (countyCode) {
      return this.evidenceService.getCapsulesByCounty(
        countyCode,
        status as CapsuleStatus | undefined,
      );
    }
    throw new BadRequestException(
      'At least one query parameter required: stationCode or countyCode'
    );
  }

  /**
   * GET /evidence/capsules/:id/chain-of-custody
   * Returns the immutable event log for a capsule.
   */
  @Get('capsules/:id/chain-of-custody')
  async getChainOfCustody(@Param('id', ParseUUIDPipe) id: string) {
    return this.evidenceService.getChainOfCustody(id);
  }

  // ── Sync status (mobile polling) ─────────────────────────────

  /**
   * PATCH /evidence/capsules/:id/sync
   * Mobile app reports its upload/sync progress.
   */
  @Patch('capsules/:id/sync')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateSyncStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncStatusDto,
  ) {
    await this.evidenceService.updateSyncStatus(id, dto);
  }

  // ── Validation (Validator App) ────────────────────────────────

  /**
   * PATCH /evidence/capsules/:id/validate
   * Human validator approves, rejects, or escalates a capsule.
   *
   * AI assists, humans decide. No automated system makes this call.
   *
   * Header required:
   *   X-Validator-User-Id: UUID of the authenticated validator
   */
  @Patch('capsules/:id/validate')
  async validateCapsule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateDecisionDto,
    @Headers('x-validator-user-id') validatorUserId: string,
  ) {
    if (!validatorUserId) {
      throw new BadRequestException('X-Validator-User-Id header is required');
    }
    return this.evidenceService.approveOrReject(
      id,
      dto.decision as 'APPROVED' | 'REJECTED' | 'ESCALATED',
      validatorUserId,
      dto.notes,
    );
  }

  // ── Trust anchoring (called by Trust Service) ────────────────

  /**
   * PATCH /evidence/capsules/:id/anchored
   * Called by the Trust Service after dual-anchor confirmation
   * (Hedera Consensus Service + RFC 3161 TSA).
   * Not exposed to web clients — internal service-to-service only.
   */
  @Patch('capsules/:id/anchored')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordAnchorCallback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnchorCallbackDto,
  ) {
    await this.evidenceService.recordAnchorCallback(
      id,
      dto.batchId,
      dto.anchorStatus,
    );
  }

  // ── AI result callback (called by AI Service) ────────────────

  /**
   * PATCH /evidence/capsules/:id/ai-result
   * Called by AI Service after completing verification pipeline.
   * Updates capsule status based on AI routing decision.
   *
   * routingDecision values:
   *   APPROVE_FOR_REVIEW → capsule moves to PENDING_VALIDATION queue
   *   MANUAL_REVIEW      → capsule flagged for closer look, still PENDING_VALIDATION
   *   ESCALATE           → capsule flagged, escalated to senior supervisor
   *
   * AI ASSISTS, HUMANS DECIDE.
   * This endpoint does NOT approve or publish — it routes to human validators.
   */
  @Patch('capsules/:id/ai-result')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordAiResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiResultDto,
  ): Promise<void> {
    await this.evidenceService.recordAiResult(id, dto.routingDecision);
  }

  // ── Tally submission (Form A data from mobile agent) ───────────────────────

  /**
   * PATCH /evidence/capsules/:id/tally
   * Field agent submits Form A tally data (registered voters, ballots, candidate votes).
   * Validates IEBC mathematical rules (Elections Regulations 2012).
   *
   * Header required:
   *   X-Agent-User-Id: UUID of the authenticated agent
   */
  @Patch('capsules/:id/tally')
  @HttpCode(HttpStatus.OK)
  async submitTally(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitTallyDto,
    @Headers('x-agent-user-id') agentUserId: string,
  ) {
    return this.evidenceService.submitTally(id, dto, agentUserId ?? 'unknown');
  }

  // ── Stats ─────────────────────────────────────────────────────

  /**
   * GET /evidence/stats
   * Returns capsule counts by status.
   * Query param: tenantId (optional)
   */
  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string) {
    return this.evidenceService.getStats(tenantId);
  }
}
