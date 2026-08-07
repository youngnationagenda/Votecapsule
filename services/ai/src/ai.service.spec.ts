// ============================================================
// VoteCapsule — AI Verification Service Unit Tests
// ============================================================
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { of } from 'rxjs';

import { AiService } from './ai.service';
import {
  AiVerificationJob,
  AiJobStatus,
  RoutingDecision,
} from './entities/ai-verification-job.entity';
import { AiAnomalyEvent } from './entities/ai-anomaly-event.entity';
import { TextractProcessor } from './processors/textract.processor';
import { NecValidatorProcessor } from './processors/nec-validator.processor';
import { ConfidenceProcessor } from './processors/confidence.processor';

// ── Mocks ────────────────────────────────────────────────────

const createMockRepository = () => ({
  find: vi.fn().mockResolvedValue([]),
  findOne: vi.fn(),
  findOneOrFail: vi.fn(),
  save: vi.fn().mockImplementation((e) => Promise.resolve({ id: 'job-1', ...e })),
  create: vi.fn().mockImplementation((e) => ({ id: 'job-1', attemptCount: 0, maxAttempts: 3, ...e })),
  count: vi.fn().mockResolvedValue(0),
  createQueryBuilder: vi.fn(() => mockQueryBuilder),
});

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  addSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  addGroupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  take: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ affected: 1 }),
  getMany: vi.fn().mockResolvedValue([]),
  getRawMany: vi.fn().mockResolvedValue([]),
};

const mockTransactionManager = {
  create: vi.fn().mockImplementation((_entity: any, data: any) => data),
  save: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
  createQueryBuilder: vi.fn(() => mockQueryBuilder),
};

const mockDataSource = {
  transaction: vi.fn().mockImplementation((cb: any) => cb(mockTransactionManager)),
};

const mockTextract = {
  analyzeDocument: vi.fn().mockResolvedValue({
    success: true,
    ocrConfidence: 0.92,
    rawText: 'INDEPENDENT ELECTORAL AND BOUNDARIES COMMISSION\nFORM 37A\nELECTION RESULTS',
    blocks: [],
  }),
  parseElectionData: vi.fn().mockReturnValue({
    stationCode: '001001001001001',
    stationName: 'Kibera Primary School',
    position: 'PRESIDENT',
    streamNumber: '1',
    registeredVoters: 500,
    votesCast: 380,
    validVotes: 370,
    rejectedVotes: 10,
  }),
};

const mockNecValidator = {
  validate: vi.fn().mockResolvedValue({
    stationCodeMatchScore: 1.0,
    positionMatchScore: 1.0,
    arithmeticScore: 1.0,
    voterLimitScore: 1.0,
    stationCodeVerified: true,
    stationNameVerified: true,
    positionVerified: true,
    voterLimitRespected: true,
    arithmeticValid: true,
    anomalies: [],
  }),
};

const mockConfidence = {
  compute: vi.fn().mockReturnValue({
    overallConfidence: 0.95,
    routingDecision: RoutingDecision.AUTO_APPROVE,
    routingReason: 'High confidence across all checks',
    isFlagged: false,
    flagReasons: [],
  }),
};

const mockHttpService = {
  patch: vi.fn().mockReturnValue(of({ data: {} })),
};

const mockConfig = {
  get: vi.fn().mockReturnValue('http://evidence-service:3005'),
};

describe('AiService', () => {
  let service: AiService;
  let jobRepo: ReturnType<typeof createMockRepository>;
  let anomalyRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    jobRepo = createMockRepository();
    anomalyRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(AiVerificationJob), useValue: jobRepo },
        { provide: getRepositoryToken(AiAnomalyEvent), useValue: anomalyRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: TextractProcessor, useValue: mockTextract },
        { provide: NecValidatorProcessor, useValue: mockNecValidator },
        { provide: ConfidenceProcessor, useValue: mockConfidence },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    vi.clearAllMocks();
  });

  // ── triggerVerification() ──────────────────────────────────

  describe('triggerVerification()', () => {
    const triggerDto = {
      capsuleId: 'capsule-1',
      iebcStationCode: '001001001001001',
      positionCode: 'PRESIDENT',
      electionYear: 2027,
      countyCode: '001',
      s3Bucket: 'vc-evidence-prod',
      s3Key: 'uploads/capsule-1.jpg',
    };

    it('should create a new job with QUEUED status', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      const result = await service.triggerVerification(triggerDto);

      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          capsuleId: 'capsule-1',
          status: AiJobStatus.QUEUED,
        }),
      );
      expect(jobRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should be idempotent — return existing job', async () => {
      const existing = { id: 'job-existing', capsuleId: 'capsule-1', status: AiJobStatus.PROCESSING };
      jobRepo.findOne.mockResolvedValue(existing);

      const result = await service.triggerVerification(triggerDto);

      expect(result).toEqual(existing);
      expect(jobRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── getJob() ───────────────────────────────────────────────

  describe('getJob()', () => {
    it('should return job with anomalies relation', async () => {
      const job = { id: 'job-1', capsuleId: 'cap-1', anomalies: [] };
      jobRepo.findOne.mockResolvedValue(job);

      const result = await service.getJob('job-1');

      expect(result).toEqual(job);
      expect(jobRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        relations: ['anomalies'],
      });
    });

    it('should throw NotFoundException', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      await expect(service.getJob('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getJobByCapsule() ──────────────────────────────────────

  describe('getJobByCapsule()', () => {
    it('should find job by capsuleId', async () => {
      const job = { id: 'job-1', capsuleId: 'cap-1' };
      jobRepo.findOne.mockResolvedValue(job);

      const result = await service.getJobByCapsule('cap-1');

      expect(result).toEqual(job);
    });

    it('should throw NotFoundException if not found', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      await expect(service.getJobByCapsule('cap-999')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getFlaggedJobs() ───────────────────────────────────────

  describe('getFlaggedJobs()', () => {
    it('should query flagged jobs', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 'job-1', isFlagged: true }]);

      const result = await service.getFlaggedJobs();

      expect(jobRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('j.isFlagged = :f', { f: true });
    });

    it('should filter by countyCode when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getFlaggedJobs('047');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('j.countyCode = :cc', { cc: '047' });
    });
  });

  // ── getStats() ─────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return breakdown by status and routing decision', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: 'COMPLETED', routingDecision: 'AUTO_APPROVE', count: '45' },
        { status: 'COMPLETED', routingDecision: 'HUMAN_REVIEW', count: '12' },
      ]);
      jobRepo.count.mockResolvedValue(57);

      const result = await service.getStats();

      expect(result).toHaveProperty('total', 57);
      expect(result).toHaveProperty('breakdown');
    });

    it('should filter by countyCode when provided', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      jobRepo.count.mockResolvedValue(0);

      await service.getStats('001');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('j.countyCode = :cc', { cc: '001' });
    });
  });

  // ── reviewAnomaly() ────────────────────────────────────────

  describe('reviewAnomaly()', () => {
    it('should mark anomaly as reviewed', async () => {
      anomalyRepo.findOne.mockResolvedValue({ id: 'anom-1', reviewedBy: null });
      anomalyRepo.findOneOrFail.mockResolvedValue({ id: 'anom-1', reviewedBy: 'reviewer-1' });
      anomalyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.reviewAnomaly('anom-1', 'reviewer-1', { outcome: 'DISMISSED' });

      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewedBy: 'reviewer-1',
          reviewOutcome: 'DISMISSED',
        }),
      );
    });

    it('should throw NotFoundException if anomaly not found', async () => {
      anomalyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reviewAnomaly('non-existent', 'reviewer-1', { outcome: 'CONFIRMED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already reviewed', async () => {
      anomalyRepo.findOne.mockResolvedValue({ id: 'anom-1', reviewedBy: 'someone-else' });

      await expect(
        service.reviewAnomaly('anom-1', 'reviewer-1', { outcome: 'CONFIRMED' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── Pipeline ───────────────────────────────────────────────

  describe('pipeline execution', () => {
    it('should run full pipeline: textract → NEC → confidence → persist', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      jobRepo.findOneOrFail.mockResolvedValue({
        id: 'job-1',
        capsuleId: 'cap-1',
        iebcStationCode: '001001001001001',
        positionCode: 'PRESIDENT',
        s3Bucket: 'vc-evidence-prod',
        s3Key: 'uploads/cap-1.jpg',
        attemptCount: 0,
        maxAttempts: 3,
      });

      await (service as any).runPipeline('job-1');

      expect(mockTextract.analyzeDocument).toHaveBeenCalledWith('vc-evidence-prod', 'uploads/cap-1.jpg');
      expect(mockTextract.parseElectionData).toHaveBeenCalled();
      expect(mockNecValidator.validate).toHaveBeenCalled();
      expect(mockConfidence.compute).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should retry on pipeline failure when attempts remain', async () => {
      jobRepo.findOneOrFail.mockResolvedValue({
        id: 'job-1',
        capsuleId: 'cap-1',
        s3Bucket: 'vc-evidence-prod',
        s3Key: 'uploads/cap-1.jpg',
        attemptCount: 0,
        maxAttempts: 3,
      });
      mockTextract.analyzeDocument.mockResolvedValue({ success: false, error: 'Textract timeout' });

      await (service as any).runPipeline('job-1');

      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AiJobStatus.QUEUED,
          lastError: expect.stringContaining('Textract failed'),
        }),
      );
    });

    it('should mark FAILED when max retries exceeded', async () => {
      jobRepo.findOneOrFail.mockResolvedValue({
        id: 'job-1',
        capsuleId: 'cap-1',
        s3Bucket: 'vc-evidence-prod',
        s3Key: 'uploads/cap-1.jpg',
        attemptCount: 3,
        maxAttempts: 3,
      });
      mockTextract.analyzeDocument.mockResolvedValue({ success: false, error: 'Textract timeout' });

      await (service as any).runPipeline('job-1');

      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: AiJobStatus.FAILED }),
      );
    });

    it('should create anomaly events when NEC detects issues', async () => {
      jobRepo.findOneOrFail.mockResolvedValue({
        id: 'job-1',
        capsuleId: 'cap-1',
        iebcStationCode: '001001001001001',
        positionCode: 'PRESIDENT',
        s3Bucket: 'vc-evidence-prod',
        s3Key: 'uploads/cap-1.jpg',
        attemptCount: 0,
        maxAttempts: 3,
      });

      mockNecValidator.validate.mockResolvedValue({
        stationCodeMatchScore: 0.5,
        positionMatchScore: 1.0,
        arithmeticScore: 0.0,
        voterLimitScore: 1.0,
        stationCodeVerified: false,
        stationNameVerified: true,
        positionVerified: true,
        voterLimitRespected: true,
        arithmeticValid: false,
        anomalies: [
          { type: 'ARITHMETIC_MISMATCH', severity: 'HIGH', description: 'Votes dont add up', evidence: {} },
          { type: 'STATION_CODE_MISMATCH', severity: 'MEDIUM', description: 'Code partial match', evidence: {} },
        ],
      });

      mockConfidence.compute.mockReturnValue({
        overallConfidence: 0.45,
        routingDecision: RoutingDecision.ESCALATE,
        routingReason: 'Multiple anomalies detected',
        isFlagged: true,
        flagReasons: ['arithmetic_mismatch', 'station_code_mismatch'],
      });

      await (service as any).runPipeline('job-1');

      expect(mockTransactionManager.save).toHaveBeenCalledTimes(2);
    });

    it('should notify Evidence Service after pipeline completes', async () => {
      jobRepo.findOneOrFail.mockResolvedValue({
        id: 'job-1',
        capsuleId: 'cap-1',
        iebcStationCode: '001001001001001',
        positionCode: 'PRESIDENT',
        s3Bucket: 'vc-evidence-prod',
        s3Key: 'uploads/cap-1.jpg',
        attemptCount: 0,
        maxAttempts: 3,
      });

      mockTextract.analyzeDocument.mockResolvedValue({
        success: true, ocrConfidence: 0.92,
        rawText: 'INDEPENDENT ELECTORAL FORM 37 ELECTION RESULTS',
        blocks: [],
      });

      await (service as any).runPipeline('job-1');

      expect(mockHttpService.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/evidence/capsules/cap-1/ai-result'),
        { routingDecision: RoutingDecision.AUTO_APPROVE },
      );
    });
  });
});
