// ============================================================
// VoteCapsule — Evidence Capsule Service
// services/evidence/src/evidence.service.ts
//
// The core of the VoteCapsule platform. Manages the complete
// lifecycle of every Evidence Capsule from capture to archival.
// ============================================================
import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  S3Client, PutObjectCommand, PutObjectRetentionCommand, ObjectLockRetentionMode,
} from '@aws-sdk/client-s3';
import {
  EvidenceCapsule, CapsuleStatus, SyncStatus, PositionCode,
} from './entities/evidence-capsule.entity';
import { EvidenceImage, ImageType }  from './entities/evidence-image.entity';
import { EvidenceHash }              from './entities/evidence-hash.entity';
import {
  EvidenceChainOfCustody, CustodyEventType,
} from './entities/evidence-chain-of-custody.entity';
import { computeCompositeHash, verifyCompositeHash, hashBytes } from './utils/sha256.util';
import type { SubmitCapsuleDto }  from './dto/submit-capsule.dto';
import type { SyncStatusDto }     from './dto/sync-status.dto';

// Geography Service integration contract
// The full Geography Service is in services/geography/
// These types mirror what GET /geography/polling-stations/:code/validate returns
interface StationValidation {
  id:               number;
  iebcStationCode:  string;
  streamNumber:     number;
  name:             string;
  registeredVoters: number;
  centreName:       string;
  wardName:         string;
  wardCode:         string;
  constituencyName: string;
  constituencyCode: string;
  countyName:       string;
  countyCode:       string;
  active:           boolean;
  stationType:      string;
}

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly geographyServiceUrl: string;
  private readonly aiServiceUrl: string;
  private readonly trustServiceUrl: string;

  constructor(
    @InjectRepository(EvidenceCapsule)
    private readonly capsuleRepo: Repository<EvidenceCapsule>,

    @InjectRepository(EvidenceImage)
    private readonly imageRepo: Repository<EvidenceImage>,

    @InjectRepository(EvidenceHash)
    private readonly hashRepo: Repository<EvidenceHash>,

    @InjectRepository(EvidenceChainOfCustody)
    private readonly custodyRepo: Repository<EvidenceChainOfCustody>,

    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.s3 = new S3Client({ region: config.get('AWS_REGION', 'us-east-1') });
    this.bucket = config.get('S3_EVIDENCE_BUCKET', 'votecapsule-evidence');
    this.geographyServiceUrl = config.get(
      'GEOGRAPHY_SERVICE_URL',
      'http://localhost:3004/api/v1/geography',
    );
    this.aiServiceUrl = config.get(
      'AI_SERVICE_URL',
      'http://localhost:3006/api/v1/ai',
    );
    this.trustServiceUrl = config.get(
      'TRUST_SERVICE_URL',
      'http://localhost:3003/api/v1/trust',
    );
  }

  // ── Submit (mobile → server) ──────────────────────────────

  /**
   * Primary entry point for a field agent submitting an Evidence Capsule.
   *
   * Flow:
   * 1. Validate polling station exists in NEC (Geography Service)
   * 2. Check for duplicate submission (same station + position + election)
   * 3. Verify SHA-256 hash matches (tamper detection)
   * 4. Upload image to S3
   * 5. Create capsule + image + hash + custody records (atomic transaction)
   * 6. Enqueue for AI processing (SQS)
   * 7. Return capsule ID and submission receipt
   */
  async submitCapsule(
    dto: SubmitCapsuleDto,
    imageBuffer: Buffer,
    agentUserId: string,
    deviceId: string,
  ): Promise<EvidenceCapsule> {
    // Step 1: Validate station via Geography Service
    const station = await this.validateStation(dto.iebcStationCode);
    if (!station.active) {
      throw new BadRequestException(
        `Polling station ${dto.iebcStationCode} is not active in this election`
      );
    }

    // Step 2: Duplicate check — one capsule per station+position+election
    await this.checkDuplicate(dto.iebcStationCode, dto.positionCode, dto.electionYear, agentUserId);

    // Step 3: Verify SHA-256 hash
    const hashVerified = verifyCompositeHash(
      {
        imageBytes: imageBuffer,
        metadata: {
          iebcStationCode:  dto.iebcStationCode,
          positionCode:     dto.positionCode,
          electionYear:     dto.electionYear,
          streamNumber:     station.streamNumber,
          captureTimestamp: dto.capturedAt,
          agentDeviceId:    deviceId,
          imageIndex:       0,
        },
      },
      dto.sha256Hash,
    );

    if (!hashVerified) {
      this.logger.warn(
        `Hash mismatch for station ${dto.iebcStationCode} from device ${deviceId}. Possible tamper.`
      );
      throw new BadRequestException(
        'Evidence integrity check failed: hash mismatch. Submission rejected.'
      );
    }

    // Step 4: Upload to S3
    const s3Key = this.buildS3Key(dto, agentUserId);
    await this.uploadToS3(s3Key, imageBuffer, dto);

    // Step 5: Atomic DB transaction
    const capsule = await this.dataSource.transaction(async (manager) => {
      // Create capsule
      const newCapsule = manager.create(EvidenceCapsule, {
        tenantId:          dto.tenantId,
        electionYear:      dto.electionYear,
        positionCode:      dto.positionCode as PositionCode,
        positionLevel:     this.getPositionLevel(dto.positionCode),
        // Denormalise NEC geography snapshot
        iebcStationCode:   station.iebcStationCode,
        pollingStationName: station.name,
        wardCode:          station.wardCode,
        wardName:          station.wardName,
        constituencyCode:  station.constituencyCode,
        constituencyName:  station.constituencyName,
        countyCode:        station.countyCode,
        countyName:        station.countyName,
        streamNumber:      station.streamNumber,
        registeredVoters:  station.registeredVoters,
        agentUserId,
        agentDeviceId:     deviceId,
        assignedPartyOrg:  dto.partyOrg ?? null,
        capturedAt:        new Date(dto.capturedAt),
        submittedAt:       new Date(),
        captureLatitude:   dto.latitude ?? null,
        captureLongitude:  dto.longitude ?? null,
        captureAltitude:   dto.altitude ?? null,
        captureAccuracyMeters: dto.accuracyMeters ?? null,
        status:            CapsuleStatus.UPLOADED,
        syncStatus:        SyncStatus.UPLOADED,
        syncAttempts:      1,
        sha256Hash:        dto.sha256Hash,
        s3ObjectKey:       s3Key,
      });
      const saved = await manager.save(newCapsule);

      // Create image record
      const image = manager.create(EvidenceImage, {
        capsuleId:       saved.id,
        imageIndex:      0,
        imageType:       ImageType.FORM_FRONT,
        fileSizeBytes:   imageBuffer.byteLength,
        sha256Hash:      hashBytes(imageBuffer),
        sha256Verified:  true,
        sha256VerifiedAt: new Date(),
        s3Bucket:        this.bucket,
        s3Key,
        uploadStatus:    'COMPLETE',
        uploadedAt:      new Date(),
      });
      await manager.save(image);

      // Create composite hash record
      const { hashValue, hashedComponents } = computeCompositeHash({
        imageBytes: imageBuffer,
        metadata: {
          iebcStationCode:  dto.iebcStationCode,
          positionCode:     dto.positionCode,
          electionYear:     dto.electionYear,
          streamNumber:     station.streamNumber,
          captureTimestamp: dto.capturedAt,
          agentDeviceId:    deviceId,
          imageIndex:       0,
        },
      });
      const hash = manager.create(EvidenceHash, {
        capsuleId:          saved.id,
        imageId:            image.id,
        hashType:           'CAPSULE_COMPOSITE',
        algorithm:          'SHA-256',
        hashValue,
        hashedComponents:   hashedComponents as Record<string, unknown>,
        computedOnDevice:   true,
        deviceId,
        serverVerified:     true,
        serverVerifiedAt:   new Date(),
        verificationMatch:  true,
      });
      await manager.save(hash);

      // Chain of custody: CREATED
      await this.addCustodyEvent(manager, saved.id, {
        eventType:    CustodyEventType.CREATED,
        newStatus:    CapsuleStatus.CAPTURED,
        actorUserId:  agentUserId,
        actorDeviceId: deviceId,
        actorService: 'evidence-service',
        eventData:    { source: 'mobile_submit' },
      });

      // Chain of custody: UPLOADED
      await this.addCustodyEvent(manager, saved.id, {
        eventType:    CustodyEventType.UPLOADED,
        previousStatus: CapsuleStatus.CAPTURED,
        newStatus:    CapsuleStatus.UPLOADED,
        actorService: 'evidence-service',
        eventData:    { s3Key },
      });

      // Chain of custody: HASH_VERIFIED
      await this.addCustodyEvent(manager, saved.id, {
        eventType:    CustodyEventType.HASH_VERIFIED,
        actorService: 'evidence-service',
        eventData:    { hash: dto.sha256Hash, match: true },
      });

      return saved;
    });

    // Step 6: Enqueue for AI processing — POST /ai/verify
    this.triggerAiVerification(capsule, station).catch((err) =>
      this.logger.error(`AI trigger failed for capsule ${capsule.id}: ${err?.message}`)
    );

    this.logger.log(`Capsule ${capsule.id} submitted — station ${dto.iebcStationCode}, position ${dto.positionCode}`);

    return capsule;
  }

  // ── Get capsule ───────────────────────────────────────────

  async getCapsule(id: string): Promise<EvidenceCapsule> {
    const c = await this.capsuleRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['images', 'hashes', 'custodyEvents'],
    });
    if (!c) throw new NotFoundException(`Evidence Capsule ${id} not found`);
    return c;
  }

  async getCapsulesByStation(
    iebcStationCode: string,
    positionCode?: string,
  ): Promise<EvidenceCapsule[]> {
    const qb = this.capsuleRepo
      .createQueryBuilder('ec')
      .where('ec.iebcStationCode = :code', { code: iebcStationCode })
      .andWhere('ec.isDeleted = FALSE')
      .orderBy('ec.submittedAt', 'DESC');
    if (positionCode) {
      qb.andWhere('ec.positionCode = :pos', { pos: positionCode });
    }
    return qb.getMany();
  }

  async getCapsulesByCounty(
    countyCode: string,
    status?: CapsuleStatus,
  ): Promise<EvidenceCapsule[]> {
    const qb = this.capsuleRepo
      .createQueryBuilder('ec')
      .where('ec.countyCode = :cc', { cc: countyCode })
      .andWhere('ec.isDeleted = FALSE')
      .orderBy('ec.submittedAt', 'DESC');
    if (status) qb.andWhere('ec.status = :s', { s: status });
    return qb.getMany();
  }

  async getChainOfCustody(capsuleId: string): Promise<EvidenceChainOfCustody[]> {
    const capsule = await this.getCapsule(capsuleId);
    return this.custodyRepo.find({
      where: { capsuleId: capsule.id },
      order: { eventTimestamp: 'ASC' },
    });
  }

  // ── Sync status update (mobile polling) ──────────────────

  async updateSyncStatus(capsuleId: string, dto: SyncStatusDto): Promise<void> {
    const c = await this.getCapsule(capsuleId);
    // Increment syncAttempts via QueryBuilder (Repository.update does not support expressions)
    await this.capsuleRepo
      .createQueryBuilder()
      .update(EvidenceCapsule)
      .set({
        syncStatus:    dto.syncStatus as SyncStatus,
        syncLastError: dto.error ?? null,
        syncAttempts:  () => 'sync_attempts + 1',
        ...(dto.syncStatus === 'COMPLETE' ? { syncCompletedAt: new Date() } : {}),
      })
      .where('id = :id', { id: c.id })
      .execute();
  }

  // ── Validation (called by Validator App) ─────────────────

  async approveOrReject(
    capsuleId: string,
    decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
    validatorUserId: string,
    notes?: string,
  ): Promise<EvidenceCapsule> {
    const c = await this.getCapsule(capsuleId);
    if (c.status !== CapsuleStatus.PENDING_VALIDATION) {
      throw new BadRequestException(
        `Capsule is in status ${c.status}, expected PENDING_VALIDATION`
      );
    }

    const newStatus = decision === 'APPROVED'  ? CapsuleStatus.APPROVED
                    : decision === 'REJECTED'  ? CapsuleStatus.REJECTED
                    : CapsuleStatus.PENDING_VALIDATION; // ESCALATED stays in queue

    await this.dataSource.transaction(async (manager) => {
      await manager.update(EvidenceCapsule, c.id, {
        status:             newStatus,
        validatedBy:        validatorUserId,
        validatedAt:        new Date(),
        validationDecision: decision,
      });

      const custodyType = decision === 'APPROVED'
        ? CustodyEventType.VALIDATION_APPROVED
        : decision === 'REJECTED'
          ? CustodyEventType.VALIDATION_REJECTED
          : CustodyEventType.VALIDATION_ESCALATED;

      await this.addCustodyEvent(manager, c.id, {
        eventType:     custodyType,
        previousStatus: c.status,
        newStatus,
        actorUserId:   validatorUserId,
        actorService:  'evidence-service',
        eventData:     { decision, notes },
      });
    });

    // Queue for Hybrid Anchor (Hedera + RFC 3161) if APPROVED
    if (decision === 'APPROVED') {
      const approved = await this.getCapsule(capsuleId);
      this.queueForTrustAnchor(approved, validatorUserId).catch((err) =>
        this.logger.error(`Trust anchor queue failed for capsule ${capsuleId}: ${err?.message}`)
      );
    }

    this.logger.log(`Capsule ${capsuleId} ${decision} by validator ${validatorUserId}`);

    return this.getCapsule(capsuleId);
  }

  // ── Trust anchor callback (called by Trust Service) ─────

  /**
   * Trust Service calls this after a Merkle batch has been dual-anchored
   * to both Hedera Consensus Service (testnet) and RFC 3161 TSA.
   *
   * Trust Service integration contract:
   *   PATCH /evidence/capsules/:id/anchored
   *   Body: { batchId: string, anchorStatus: AnchorCallbackStatus }
   *
   * Status transitions:
   *   APPROVED → ANCHORED   (when anchorStatus is DUAL_ANCHORED)
   *   APPROVED → ANCHORED   (when anchorStatus is HEDERA_ONLY or TSA_ONLY — partial; still advance)
   *   Any other status is logged and ignored gracefully.
   */
  async recordAnchorCallback(
    capsuleId:    string,
    batchId:      string,
    anchorStatus: string,
  ): Promise<void> {
    const c = await this.getCapsule(capsuleId);
    if (c.status !== CapsuleStatus.APPROVED) {
      this.logger.warn(
        `Trust anchor callback for capsule ${capsuleId} in unexpected status ${c.status} — ignoring.`
      );
      return;
    }

    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      // Advance capsule to ANCHORED and store batch reference
      await manager.update(EvidenceCapsule, c.id, {
        status:            CapsuleStatus.ANCHORED,
        trustAnchorBatchId: batchId,
        anchorStatus,
        anchoredAt:        now,
      });

      // Update the composite hash record with batch linkage
      await manager.update(
        EvidenceHash,
        { capsuleId: c.id, hashType: 'CAPSULE_COMPOSITE' },
        { trustAnchorBatchId: batchId, anchorStatus, anchoredAt: now },
      );

      await this.addCustodyEvent(manager, c.id, {
        eventType:      CustodyEventType.TRUST_ANCHORED,
        previousStatus: CapsuleStatus.APPROVED,
        newStatus:      CapsuleStatus.ANCHORED,
        actorService:   'trust-service',
        eventData:      { batchId, anchorStatus },
      });
    });

    // Apply S3 Object Lock now that evidence is immutably anchored
    await this.applyS3ObjectLock(c.s3ObjectKey!);
    this.logger.log(
      `Capsule ${capsuleId} trust-anchored: batch=${batchId} status=${anchorStatus}`,
    );
  }

  // ── AI result callback ────────────────────────────────────

  /**
   * Called by AI Service after completing the verification pipeline.
   * Routes capsule to PENDING_VALIDATION queue for human validators.
   *
   * AI ASSISTS, HUMANS DECIDE.
   */
  async recordAiResult(capsuleId: string, routingDecision: string): Promise<void> {
    const c = await this.getCapsule(capsuleId);
    const isFlagged = routingDecision === 'ESCALATE' || routingDecision === 'MANUAL_REVIEW';

    await this.dataSource.transaction(async (manager) => {
      await manager.update(EvidenceCapsule, c.id, {
        status:        CapsuleStatus.PENDING_VALIDATION,
        aiProcessedAt: new Date(),
        aiFlagged:     isFlagged,
      });

      await this.addCustodyEvent(manager, c.id, {
        eventType:     CustodyEventType.AI_COMPLETED,
        previousStatus: c.status,
        newStatus:     CapsuleStatus.PENDING_VALIDATION,
        actorService:  'ai-service',
        eventData:     { routingDecision, isFlagged },
      });
    });

    this.logger.log(
      `AI result for capsule ${capsuleId}: ${routingDecision} → PENDING_VALIDATION`,
    );
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats(tenantId?: string): Promise<Record<string, number>> {
    const qb = this.capsuleRepo
      .createQueryBuilder('ec')
      .select('ec.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ec.isDeleted = FALSE')
      .groupBy('ec.status');
    if (tenantId) qb.andWhere('ec.tenantId = :t', { t: tenantId });
    const rows = await qb.getRawMany();
    return Object.fromEntries(rows.map((r) => [r.status, parseInt(r.count, 10)]));
  }

  // ── Private helpers ───────────────────────────────────────

  /**
   * Calls Geography Service to validate a station code.
   * Geography Service: GET /api/v1/geography/polling-stations/:code/validate
   *
   * Returns full station context if valid.
   * Throws 404 (via Geography Service) if station code is not in the NEC database.
   * Throws BadRequestException if code format is wrong.
   */
  private async validateStation(iebcStationCode: string): Promise<StationValidation> {
    if (!/^\d{15}$/.test(iebcStationCode)) {
      throw new BadRequestException(
        `Invalid IEBC station code format: ${iebcStationCode}. Must be exactly 15 digits.`,
      );
    }

    const url = `${this.geographyServiceUrl}/api/v1/geography/polling-stations/${iebcStationCode}/validate`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<StationValidation>(url),
      );
      return response.data;
    } catch (error: unknown) {
      const httpError = error as { response?: { status?: number } };
      if (httpError?.response?.status === 404) {
        throw new NotFoundException(
          `Polling station ${iebcStationCode} not found in NEC database. Submission rejected.`,
        );
      }
      this.logger.error(
        `Geography Service unreachable at ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Unable to validate station ${iebcStationCode}: Geography Service unavailable.`,
      );
    }
  }

  private async checkDuplicate(
    stationCode: string,
    positionCode: string,
    electionYear: number,
    agentUserId: string,
  ): Promise<void> {
    const existing = await this.capsuleRepo.findOne({
      where: {
        iebcStationCode: stationCode,
        positionCode:    positionCode as PositionCode,
        electionYear,
        isDeleted:       false,
      },
    });
    if (existing && existing.agentUserId !== agentUserId) {
      throw new ConflictException(
        `A capsule for station ${stationCode}, position ${positionCode} already exists (ID: ${existing.id})`
      );
    }
    if (existing && existing.status !== CapsuleStatus.REJECTED) {
      throw new ConflictException(
        `Station ${stationCode} / ${positionCode} has already been submitted (status: ${existing.status})`
      );
    }
  }

  private buildS3Key(dto: SubmitCapsuleDto, agentUserId: string): string {
    // Structure: evidence/{year}/{county}/{constituency}/{station}/{position}/{agentId}/{timestamp}.jpg
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return [
      'evidence',
      dto.electionYear,
      dto.iebcStationCode.slice(0, 3),   // county code
      dto.iebcStationCode.slice(3, 6),   // constituency code
      dto.iebcStationCode,
      dto.positionCode,
      agentUserId,
      `${ts}.jpg`,
    ].join('/');
  }

  private async uploadToS3(key: string, buffer: Buffer, dto: SubmitCapsuleDto): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        buffer,
        ContentType: 'image/jpeg',
        Metadata: {
          'capsule-station':  dto.iebcStationCode,
          'capsule-position': dto.positionCode,
          'capsule-year':     String(dto.electionYear),
          'capsule-sha256':   dto.sha256Hash,
        },
      })
    );
    this.logger.debug(`Uploaded evidence image to s3://${this.bucket}/${key}`);
  }

  // ── AI + Trust integration helpers ──────────────────────

  /**
   * Fire-and-forget: triggers AI verification pipeline for a newly submitted capsule.
   * POST /api/v1/ai/verify
   * Called asynchronously after submitCapsule — does NOT block the response to the mobile app.
   */
  private async triggerAiVerification(
    capsule: EvidenceCapsule,
    station: StationValidation,
  ): Promise<void> {
    const url = `${this.aiServiceUrl}/verify`;
    const payload = {
      capsuleId:      capsule.id,
      iebcStationCode: capsule.iebcStationCode,
      positionCode:   capsule.positionCode,
      electionYear:   capsule.electionYear,
      countyCode:     capsule.countyCode,
      s3Bucket:       this.bucket,
      s3Key:          capsule.s3ObjectKey,
    };

    await firstValueFrom(
      this.httpService.post(url, payload, {
        headers: { 'x-internal-service': 'evidence-service' },
        timeout: 5000,
      })
    );
    this.logger.log(`AI verification triggered for capsule ${capsule.id}`);
  }

  /**
   * Fire-and-forget: queues an approved capsule for Hybrid Anchor.
   * POST /api/v1/trust/anchor
   * Called asynchronously after approveOrReject(APPROVED) — does NOT block the validator's response.
   */
  private async queueForTrustAnchor(
    capsule: EvidenceCapsule,
    validatorUserId: string,
  ): Promise<void> {
    const url = `${this.trustServiceUrl}/anchor`;
    const compositeHash = await this.hashRepo.findOne({
      where: { capsuleId: capsule.id, hashType: 'CAPSULE_COMPOSITE' },
    });
    if (!compositeHash) {
      this.logger.warn(`No composite hash found for capsule ${capsule.id} — skipping trust anchor`);
      return;
    }

    const payload = {
      capsuleId:         capsule.id,
      sha256Hash:        compositeHash.hashValue,
      positionCode:      capsule.positionCode,
      iebcStationCode:   capsule.iebcStationCode,
      electionYear:      capsule.electionYear,
      countyCode:        capsule.countyCode,
      countyName:        capsule.countyName,
      requestedByService: 'evidence-service',
      validatorUserId,
    };

    await firstValueFrom(
      this.httpService.post(url, payload, {
        headers: { 'x-internal-service': 'evidence-service' },
        timeout: 5000,
      })
    );
    this.logger.log(`Trust anchor queued for capsule ${capsule.id} (Merkle batch)`);
  }

  private async applyS3ObjectLock(s3Key: string): Promise<void> {
    // Apply WORM Object Lock after trust anchoring — makes the evidence immutable.
    // Requires the S3 bucket to have Object Lock enabled (set in CDK VoteCapsuleStorageStack).
    // Retain for 10 years (Kenya electoral law retention period).
    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + 10);

    try {
      await this.s3.send(new PutObjectRetentionCommand({
        Bucket:             this.bucket,
        Key:                s3Key,
        Retention: {
          Mode:            ObjectLockRetentionMode.COMPLIANCE,
          RetainUntilDate: retainUntil,
        },
        // BypassGovernanceRetention omitted — COMPLIANCE mode cannot be bypassed
      }));
      this.logger.log(`S3 Object Lock (COMPLIANCE, 10yr) applied to s3://${this.bucket}/${s3Key}`);
    } catch (err: unknown) {
      // If bucket does not have Object Lock enabled, log warning but do not fail the anchor flow
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ObjectLockConfigurationNotFoundError') || msg.includes('NoSuchObjectLockConfiguration')) {
        this.logger.warn(`S3 Object Lock not enabled on bucket ${this.bucket} — skipping WORM lock for ${s3Key}. Enable in CDK to activate.`);
      } else {
        this.logger.error(`Failed to apply S3 Object Lock to ${s3Key}: ${msg}`);
        throw err;
      }
    }
  }

  private async addCustodyEvent(
    manager: EntityManager,
    capsuleId: string,
    event: {
      eventType:      CustodyEventType;
      previousStatus?: string;
      newStatus?:     string;
      actorUserId?:   string;
      actorService?:  string;
      actorDeviceId?: string;
      eventData?:     Record<string, unknown>;
    },
  ): Promise<void> {
    const record = manager.create(EvidenceChainOfCustody, {
      capsuleId,
      eventType:      event.eventType,
      previousStatus: event.previousStatus ?? null,
      newStatus:      event.newStatus ?? null,
      actorUserId:    event.actorUserId ?? null,
      actorService:   event.actorService ?? null,
      actorDeviceId:  event.actorDeviceId ?? null,
      eventData:      event.eventData ?? null,
      eventTimestamp: new Date(),
    });
    await manager.save(record);
  }

  private getPositionLevel(positionCode: string): string {
    const levels: Record<string, string> = {
      PRESIDENT:  'NATIONAL',
      GOVERNOR:   'COUNTY',
      SENATOR:    'COUNTY',
      WOMEN_REP:  'COUNTY',
      MP:         'CONSTITUENCY',
      MCA:        'WARD',
    };
    return levels[positionCode] ?? 'UNKNOWN';
  }
}
