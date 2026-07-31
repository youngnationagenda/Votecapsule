// ============================================================
// VoteCapsule — Trust Service Controller (Hybrid Anchor)
// services/trust/src/trust.controller.ts
//
// REST API matching V13 Chapter 9 specification.
// Hedera + RFC 3161 dual-anchor architecture.
// ============================================================
import {
  Controller, Post, Get, Body, Param, Query, Headers,
  ParseUUIDPipe, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { TrustService }          from './trust.service';
import { AnchorRequestDto }      from './dto/anchor-request.dto';
import { RequesterType }         from './entities/trust-verification.entity';

@Controller('trust')
export class TrustController {
  private readonly logger = new Logger(TrustController.name);

  constructor(private readonly trustService: TrustService) {}

  // ── POST /trust/anchor ───────────────────────────────────

  /**
   * POST /api/v1/trust/anchor
   *
   * Queues an approved Evidence Capsule's SHA-256 hash for the
   * next Merkle batch (processed every 60 seconds).
   *
   * Called by: Evidence Service / Workflow Engine (internal)
   * Not exposed to end-user clients.
   *
   * Idempotent — safe to retry.
   */
  @Post('anchor')
  @HttpCode(HttpStatus.ACCEPTED)
  async anchor(@Body() dto: AnchorRequestDto) {
    return this.trustService.queueForAnchor(dto);
  }

  // ── GET /trust/verify/:capsuleId ─────────────────────────

  /**
   * GET /api/v1/trust/verify/:capsuleId
   *
   * Returns full dual-anchor verification proof for an Evidence Capsule.
   * Includes: Merkle proof path, Hedera transaction, RFC 3161 token status.
   *
   * Any authenticated party can call this.
   */
  @Get('verify/:capsuleId')
  async verify(
    @Param('capsuleId', ParseUUIDPipe) capsuleId: string,
    @Headers('x-requester-id') requesterId?: string,
    @Query('type') requesterType?: string,
  ) {
    const type = (requesterType as RequesterType) ?? RequesterType.USER;
    return this.trustService.verifyCapsule(capsuleId, requesterId, type);
  }

  // ── GET /trust/verify-hash/:sha256Hash ───────────────────

  /**
   * GET /api/v1/trust/verify-hash/:sha256Hash
   *
   * Verifies if a given SHA-256 hash exists in the trust system.
   * Anyone with a SHA-256 hash can verify independently.
   *
   * Returns Merkle proof + Hedera explorer URL + RFC 3161 status.
   */
  @Get('verify-hash/:sha256Hash')
  async verifyByHash(
    @Param('sha256Hash') sha256Hash: string,
    @Headers('x-requester-id') requesterId?: string,
  ) {
    return this.trustService.verifyByHash(sha256Hash, requesterId);
  }

  // ── GET /trust/batch/:batchId ────────────────────────────

  /**
   * GET /api/v1/trust/batch/:batchId
   *
   * Returns full batch details including all leaves.
   * Used by auditors to inspect a complete Merkle batch.
   */
  @Get('batch/:batchId')
  async getBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.trustService.getBatch(batchId);
  }

  // ── GET /trust/proof/:capsuleId ──────────────────────────

  /**
   * GET /api/v1/trust/proof/:capsuleId
   *
   * Returns the Merkle proof path for a specific capsule.
   * A verifier can use this to mathematically confirm the capsule's
   * hash is included in the anchored Merkle root.
   *
   * Includes HashScan explorer URL for public verification.
   */
  @Get('proof/:capsuleId')
  async getProof(@Param('capsuleId', ParseUUIDPipe) capsuleId: string) {
    return this.trustService.getProof(capsuleId);
  }

  // ── GET /trust/stats ─────────────────────────────────────

  /**
   * GET /api/v1/trust/stats
   *
   * Returns anchor statistics: total batches, leaves,
   * dual-anchored count, pending queue size, etc.
   */
  @Get('stats')
  async getStats() {
    return this.trustService.getStats();
  }
}
