// ============================================================
// VoteCapsule — AI Verification Service
// services/ai/src/ai.service.ts
//
// AI ASSISTS, HUMANS DECIDE.
// This service NEVER makes a final election decision.
// ============================================================
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

import {
  AiVerificationJob,
  AiJobStatus,
  RoutingDecision,
  TextractStatus,
} from './entities/ai-verification-job.entity';
import { AiAnomalyEvent } from './entities/ai-anomaly-event.entity';
import { TextractProcessor }     from './processors/textract.processor';
import { NecValidatorProcessor } from './processors/nec-validator.processor';
import { ConfidenceProcessor }   from './processors/confidence.processor';
import { TriggerAiJobDto }       from './dto/trigger-ai-job.dto';
import { ReviewAnomalyDto }      from './dto/review-anomaly.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly evidenceBaseUrl: string;

  constructor(
    @InjectRepository(AiVerificationJob)
    private readonly jobRepo: Repository<AiVerificationJob>,
    @InjectRepository(AiAnomalyEvent)
    private readonly anomalyRepo: Repository<AiAnomalyEvent>,

    private readonly dataSource:        DataSource,
    private readonly textract:          TextractProcessor,
    private readonly necValidator:      NecValidatorProcessor,
    private readonly confidence:        ConfidenceProcessor,
    private readonly http:              HttpService,
    private readonly config:            ConfigService,
  ) {
    this.evidenceBaseUrl = config.get(
      'EVIDENCE_SERVICE_URL',
      'http://evidence-service:3005',
    );
  }

  // ── Trigger ───────────────────────────────────────────────

  /**
   * Called by Evidence Service when a capsule reaches APPROVED state.
   * Idempotent — returns existing job if already triggered.
   */
  async triggerVerification(dto: TriggerAiJobDto): Promise<AiVerificationJob> {
    const existing = await this.jobRepo.findOne({
      where: { capsuleId: dto.capsuleId },
    });
    if (existing) {
      this.logger.warn(
        `AI job already exists for capsule ${dto.capsuleId} — status: ${existing.status}`,
      );
      return existing;
    }

    const job = this.jobRepo.create({
      capsuleId:       dto.capsuleId,
      iebcStationCode: dto.iebcStationCode,
      positionCode:    dto.positionCode,
      electionYear:    dto.electionYear,
      countyCode:      dto.countyCode,
      s3Bucket:        dto.s3Bucket,
      s3Key:           dto.s3Key,
      status:          AiJobStatus.QUEUED,
    });
    const saved = await this.jobRepo.save(job);

    // Run pipeline asynchronously — don't block the HTTP response
    setImmediate(() => {
      this.runPipeline(saved.id).catch((err: unknown) => {
        this.logger.error(
          `Pipeline error for job ${saved.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });

    return saved;
  }

  // ── Queries ───────────────────────────────────────────────

  async getJob(jobId: string): Promise<AiVerificationJob> {
    const job = await this.jobRepo.findOne({
      where:    { id: jobId },
      relations: ['anomalies'],
    });
    if (!job) throw new NotFoundException(`AI job ${jobId} not found`);
    return job;
  }

  async getJobByCapsule(capsuleId: string): Promise<AiVerificationJob> {
    const job = await this.jobRepo.findOne({
      where:    { capsuleId },
      relations: ['anomalies'],
    });
    if (!job) throw new NotFoundException(`AI job for capsule ${capsuleId} not found`);
    return job;
  }

  async getFlaggedJobs(countyCode?: string): Promise<AiVerificationJob[]> {
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .where('j.isFlagged = :f', { f: true })
      .orderBy('j.createdAt', 'DESC')
      .take(100);

    if (countyCode) {
      qb.andWhere('j.countyCode = :cc', { cc: countyCode });
    }
    return qb.getMany();
  }

  async getStats(countyCode?: string): Promise<Record<string, unknown>> {
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .select('j.status', 'status')
      .addSelect('j.routingDecision', 'routingDecision')
      .addSelect('COUNT(*)', 'count')
      .groupBy('j.status')
      .addGroupBy('j.routingDecision');

    if (countyCode) {
      qb.where('j.countyCode = :cc', { cc: countyCode });
    }

    const breakdown = await qb.getRawMany();
    const total = await (countyCode
      ? this.jobRepo.count({ where: { countyCode } })
      : this.jobRepo.count());

    return { total, breakdown };
  }

  // ── Anomaly review ────────────────────────────────────────

  async reviewAnomaly(
    anomalyId:   string,
    reviewerId:  string,
    dto:         ReviewAnomalyDto,
  ): Promise<AiAnomalyEvent> {
    const anomaly = await this.anomalyRepo.findOne({ where: { id: anomalyId } });
    if (!anomaly) throw new NotFoundException(`Anomaly ${anomalyId} not found`);
    if (anomaly.reviewedBy) throw new ConflictException('Anomaly already reviewed');

    await this.anomalyRepo
      .createQueryBuilder()
      .update(AiAnomalyEvent)
      .set({
        reviewedBy:     reviewerId,
        reviewedAt:     new Date(),
        reviewOutcome:  dto.outcome,
      })
      .where('id = :id', { id: anomalyId })
      .execute();

    return this.anomalyRepo.findOneOrFail({ where: { id: anomalyId } });
  }

  // ── Pipeline ──────────────────────────────────────────────

  private async runPipeline(jobId: string): Promise<void> {
    const startedAt = new Date();

    await this.jobRepo
      .createQueryBuilder()
      .update(AiVerificationJob)
      .set({ status: AiJobStatus.PROCESSING, startedAt })
      .where('id = :id', { id: jobId })
      .execute();

    const job = await this.jobRepo.findOneOrFail({ where: { id: jobId } });

    try {
      await this.executeStages(job, startedAt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Pipeline failed for job ${jobId}: ${msg}`);

      const canRetry = job.attemptCount < job.maxAttempts;
      await this.jobRepo
        .createQueryBuilder()
        .update(AiVerificationJob)
        .set({
          status:      canRetry ? AiJobStatus.QUEUED : AiJobStatus.FAILED,
          lastError:   msg,
          attemptCount: () => 'attempt_count + 1',
          nextRetryAt: canRetry
            ? new Date(Date.now() + 60_000 * job.attemptCount)
            : null,
        })
        .where('id = :id', { id: jobId })
        .execute();
    }
  }

  private async executeStages(
    job:       AiVerificationJob,
    startedAt: Date,
  ): Promise<void> {
    // Stage 1: Textract OCR
    this.logger.log(`[${job.id}] Stage 1: Textract OCR`);
    const textractResult = await this.textract.analyzeDocument(
      job.s3Bucket!,
      job.s3Key!,
    );
    if (!textractResult.success) {
      throw new Error(`Textract failed: ${textractResult.error ?? 'unknown'}`);
    }

    await this.jobRepo
      .createQueryBuilder()
      .update(AiVerificationJob)
      .set({ textractStatus: TextractStatus.SUCCEEDED })
      .where('id = :id', { id: job.id })
      .execute();

    const electionData = this.textract.parseElectionData(textractResult);
    const formRecognitionScore = this.computeFormRecognitionScore(electionData, textractResult.rawText);

    // Stage 2: NEC cross-validation
    this.logger.log(`[${job.id}] Stage 2: NEC cross-validation`);
    const necResult = await this.necValidator.validate({
      submittedStationCode:      job.iebcStationCode,
      extractedStationCode:      electionData.stationCode,
      submittedPositionCode:     job.positionCode,
      extractedPosition:         electionData.position,
      extractedRegisteredVoters: electionData.registeredVoters,
      extractedVotesCast:        electionData.votesCast,
      extractedValidVotes:       electionData.validVotes,
      extractedRejectedVotes:    electionData.rejectedVotes,
      extractedStreamNumber:     electionData.streamNumber,
    });

    // Stage 3: Confidence score
    this.logger.log(`[${job.id}] Stage 3: Confidence computation`);
    const confidenceResult = this.confidence.compute({
      ocrConfidence:          textractResult.ocrConfidence,
      formRecognitionScore,
      stationCodeMatchScore:  necResult.stationCodeMatchScore,
      positionMatchScore:     necResult.positionMatchScore,
      voteArithmeticScore:    necResult.arithmeticScore,
      voterLimitScore:        necResult.voterLimitScore,
      anomalies:              necResult.anomalies,
    });

    // Stage 4: Persist results
    this.logger.log(`[${job.id}] Stage 4: Persisting results`);
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const completedAt = new Date();
      const durationMs  = completedAt.getTime() - startedAt.getTime();

      await manager
        .createQueryBuilder()
        .update(AiVerificationJob)
        .set({
          status: AiJobStatus.COMPLETED, completedAt, durationMs,
          ocrConfidence: textractResult.ocrConfidence,
          rawOcrText: textractResult.rawText,
          ocrBlocks: textractResult.blocks as unknown as Record<string, unknown>[],
          extractedStationCode: electionData.stationCode,
          extractedStationName: electionData.stationName,
          extractedPosition: electionData.position,
          extractedStreamNumber: electionData.streamNumber,
          extractedRegisteredVoters: electionData.registeredVoters,
          extractedVotesCast: electionData.votesCast,
          extractedValidVotes: electionData.validVotes,
          extractedRejectedVotes: electionData.rejectedVotes,
          formRecognitionScore,
          stationCodeMatchScore: necResult.stationCodeMatchScore,
          positionMatchScore: necResult.positionMatchScore,
          voteArithmeticScore: necResult.arithmeticScore,
          voterLimitScore: necResult.voterLimitScore,
          overallConfidence: confidenceResult.overallConfidence,
          stationCodeVerified: necResult.stationCodeVerified,
          stationNameVerified: necResult.stationNameVerified,
          positionVerified: necResult.positionVerified,
          voterLimitRespected: necResult.voterLimitRespected,
          arithmeticValid: necResult.arithmeticValid,
          routingDecision: confidenceResult.routingDecision,
          routingReason: confidenceResult.routingReason,
          isFlagged: confidenceResult.isFlagged,
          flagReasons: confidenceResult.flagReasons,
        })
        .where('id = :id', { id: job.id })
        .execute();

      for (const anomaly of necResult.anomalies) {
        const event = manager.create(AiAnomalyEvent, {
          jobId:         job.id,
          capsuleId:     job.capsuleId,
          anomalyType:   anomaly.type,
          severity:      anomaly.severity,
          description:   anomaly.description,
          evidenceData:  anomaly.evidence,
          autoEscalated: confidenceResult.routingDecision === RoutingDecision.ESCALATE,
        });
        await manager.save(event);
      }
    });

    // Stage 5: Notify Evidence Service of AI outcome
    this.logger.log(`[${job.id}] Stage 5: Notifying Evidence Service`);
    await this.notifyEvidenceService(job.capsuleId, confidenceResult.routingDecision);

    this.logger.log(
      `[${job.id}] Pipeline complete: ${confidenceResult.overallConfidence} → ${confidenceResult.routingDecision}`,
    );
  }

  private computeFormRecognitionScore(
    data:    ReturnType<TextractProcessor['parseElectionData']>,
    rawText: string,
  ): number {
    let score = 0.0;
    const text = rawText.toUpperCase();
    if (data.stationCode)         score += 0.20;
    if (data.registeredVoters)    score += 0.15;
    if (data.votesCast !== null)  score += 0.15;
    if (data.position)            score += 0.15;
    if (data.streamNumber)        score += 0.10;
    if (text.includes('INDEPENDENT ELECTORAL'))   score += 0.10;
    if (text.includes('FORM 37'))                 score += 0.10;
    if (text.includes('ELECTION RESULTS'))        score += 0.05;
    return Math.min(score, 1.0);
  }

  private async notifyEvidenceService(
    capsuleId:       string,
    routingDecision: RoutingDecision,
  ): Promise<void> {
    try {
      const url = `${this.evidenceBaseUrl}/api/v1/evidence/capsules/${capsuleId}/ai-result`;
      await firstValueFrom(
        this.http
          .patch(url, { routingDecision })
          .pipe(
            timeout(5_000),
            catchError(() => of(null)),
          ),
      );
    } catch {
      this.logger.warn(
        `Failed to notify Evidence Service for capsule ${capsuleId} — non-fatal`,
      );
    }
  }
}
