// ============================================================
// VoteCapsule — AI Verification Controller
// services/ai/src/ai.controller.ts
//
// REST API for the AI Verification Service.
// Spec reference: V13 Chapter 7 — AI Verification endpoints
//
// BASE: /api/v1/ai
//
// POST   /ai/verify                  — trigger pipeline (Evidence Service → AI Service)
// GET    /ai/jobs/:jobId             — get job details + anomalies
// GET    /ai/jobs/capsule/:capsuleId — get job by capsule ID
// GET    /ai/jobs/flagged            — list flagged jobs
// GET    /ai/stats                   — aggregate stats
// PATCH  /ai/anomalies/:anomalyId/review — human reviews an anomaly
// ============================================================
import {
  Controller, Post, Get, Patch,
  Param, Query, Body, Headers,
  ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { AiService }         from './ai.service';
import { TriggerAiJobDto }   from './dto/trigger-ai-job.dto';
import { ReviewAnomalyDto }  from './dto/review-anomaly.dto';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/verify
   * Triggered by Evidence Service when a capsule is approved for AI processing.
   * Idempotent — returns existing job if already triggered.
   */
  @Post('verify')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerVerification(
    @Body() dto: TriggerAiJobDto,
  ) {
    const job = await this.aiService.triggerVerification(dto);
    return { status: 'accepted', jobId: job.id, jobStatus: job.status };
  }

  /**
   * GET /ai/jobs/:jobId
   * Full job details including anomalies.
   */
  @Get('jobs/:jobId')
  async getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.aiService.getJob(jobId);
  }

  /**
   * GET /ai/jobs/capsule/:capsuleId
   * Look up AI job by evidence capsule ID.
   */
  @Get('jobs/capsule/:capsuleId')
  async getJobByCapsule(
    @Param('capsuleId', ParseUUIDPipe) capsuleId: string,
  ) {
    return this.aiService.getJobByCapsule(capsuleId);
  }

  /**
   * GET /ai/jobs/flagged
   * Returns all flagged jobs for supervisor review.
   * Optional: ?countyCode=001
   */
  @Get('jobs/flagged')
  async getFlaggedJobs(
    @Query('countyCode') countyCode?: string,
  ) {
    return this.aiService.getFlaggedJobs(countyCode);
  }

  /**
   * GET /ai/stats
   * Aggregate counts by status and routing decision.
   * Optional: ?countyCode=001
   */
  @Get('stats')
  async getStats(
    @Query('countyCode') countyCode?: string,
  ) {
    return this.aiService.getStats(countyCode);
  }

  /**
   * PATCH /ai/anomalies/:anomalyId/review
   * Human supervisor reviews and resolves an anomaly flag.
   *
   * AI ASSISTS, HUMANS DECIDE.
   * This endpoint is how humans close AI-flagged anomalies.
   * Requires X-Reviewer-User-Id header.
   */
  @Patch('anomalies/:anomalyId/review')
  async reviewAnomaly(
    @Param('anomalyId', ParseUUIDPipe) anomalyId: string,
    @Headers('x-reviewer-user-id') reviewerId: string,
    @Body() dto: ReviewAnomalyDto,
  ) {
    return this.aiService.reviewAnomaly(anomalyId, reviewerId, dto);
  }
}
