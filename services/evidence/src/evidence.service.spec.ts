/**
 * VoteCapsule -- Evidence Service Unit Tests
 * services/evidence/src/evidence.service.spec.ts
 *
 * Comprehensive tests for the core EvidenceService:
 * - SHA-256 composite hash computation and verification
 * - Tally submission with validateTallyMath() edge cases
 * - Capsule creation, AI trigger, trust anchor queue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import * as crypto from 'crypto';

import { EvidenceService } from './evidence.service';
import { EvidenceCapsule, CapsuleStatus, SyncStatus, PositionCode } from './entities/evidence-capsule.entity';
import { EvidenceImage } from './entities/evidence-image.entity';
import { EvidenceHash } from './entities/evidence-hash.entity';
import { EvidenceChainOfCustody } from './entities/evidence-chain-of-custody.entity';
import { computeCompositeHash, verifyCompositeHash, hashBytes } from './utils/sha256.util';
import { EvidenceSearchService } from './search/evidence-search.service';

// ── Mock S3 ────────────────────────────────────────────────────
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  PutObjectRetentionCommand: vi.fn(),
  ObjectLockRetentionMode: { COMPLIANCE: 'COMPLIANCE' },
}));

// ── SHA-256 Composite Hash Tests ───────────────────────────────

describe('SHA-256 Composite Hash', () => {
  const testImageBuffer = Buffer.from('fake-image-bytes-for-testing');
  const testMetadata = {
    iebcStationCode: '001001001000001',
    positionCode: 'PRESIDENT',
    electionYear: 2027,
    streamNumber: 1,
    captureTimestamp: '2027-08-09T06:00:00.000Z',
    agentDeviceId: 'device-uuid-1234',
    imageIndex: 0,
  };

  it('computeCompositeHash produces a valid 64-char hex SHA-256', () => {
    const result = computeCompositeHash({
      imageBytes: testImageBuffer,
      metadata: testMetadata,
    });

    expect(result.hashValue).toMatch(/^[a-f0-9]{64}$/);
    expect(result.hashedComponents.imageSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.hashedComponents.captureTimestamp).toBe('2027-08-09T06:00:00.000Z');
  });

  it('computeCompositeHash produces deterministic output for same input', () => {
    const result1 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });
    const result2 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });

    expect(result1.hashValue).toBe(result2.hashValue);
  });

  it('computeCompositeHash with different metadata key order produces SAME hash (sorted)', () => {
    // Metadata with keys in a different insertion order
    const metadataReordered = {
      captureTimestamp: '2027-08-09T06:00:00.000Z',
      imageIndex: 0,
      agentDeviceId: 'device-uuid-1234',
      electionYear: 2027,
      iebcStationCode: '001001001000001',
      streamNumber: 1,
      positionCode: 'PRESIDENT',
    };

    const result1 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });
    const result2 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: metadataReordered });

    expect(result1.hashValue).toBe(result2.hashValue);
  });

  it('computeCompositeHash produces DIFFERENT hash for different image bytes', () => {
    const differentImage = Buffer.from('different-image-bytes');

    const result1 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });
    const result2 = computeCompositeHash({ imageBytes: differentImage, metadata: testMetadata });

    expect(result1.hashValue).not.toBe(result2.hashValue);
  });

  it('computeCompositeHash produces DIFFERENT hash for different metadata', () => {
    const differentMetadata = { ...testMetadata, electionYear: 2032 };

    const result1 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });
    const result2 = computeCompositeHash({ imageBytes: testImageBuffer, metadata: differentMetadata });

    expect(result1.hashValue).not.toBe(result2.hashValue);
  });

  it('computeCompositeHash follows the formula: SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)', () => {
    const result = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });

    // Manually compute expected hash following the documented formula
    const imageSha256 = crypto.createHash('sha256').update(testImageBuffer).digest('hex');
    const sortedKeys = Object.keys(testMetadata).sort();
    const metadataJson = JSON.stringify(testMetadata, sortedKeys);
    const composite = imageSha256 + metadataJson + testMetadata.captureTimestamp;
    const expectedHash = crypto.createHash('sha256').update(composite, 'utf8').digest('hex');

    expect(result.hashValue).toBe(expectedHash);
    expect(result.hashedComponents.imageSha256).toBe(imageSha256);
    expect(result.hashedComponents.metadataJson).toBe(metadataJson);
  });

  it('verifyCompositeHash returns true for matching hash', () => {
    const { hashValue } = computeCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata });
    const isValid = verifyCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata }, hashValue);

    expect(isValid).toBe(true);
  });

  it('verifyCompositeHash returns false for tampered hash', () => {
    const tamperedHash = 'a'.repeat(64);
    const isValid = verifyCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata }, tamperedHash);

    expect(isValid).toBe(false);
  });

  it('verifyCompositeHash returns false for invalid hex string', () => {
    const isValid = verifyCompositeHash({ imageBytes: testImageBuffer, metadata: testMetadata }, 'not-a-valid-hex');

    expect(isValid).toBe(false);
  });

  it('hashBytes produces correct SHA-256 of raw buffer', () => {
    const buffer = Buffer.from('hello world');
    const expected = crypto.createHash('sha256').update(buffer).digest('hex');

    expect(hashBytes(buffer)).toBe(expected);
  });
});

// ── EvidenceService Unit Tests ─────────────────────────────────

describe('EvidenceService', () => {
  let service: EvidenceService;
  let capsuleRepo: any;
  let imageRepo: any;
  let hashRepo: any;
  let custodyRepo: any;
  let dataSource: any;
  let configService: any;
  let httpService: any;
  let searchService: any;

  // Realistic Kenya election numbers
  const validTallyDto = {
    formType: 'FORM_34A',
    registeredVoters: 500,
    ballotsIssued: 420,
    spoiltBallots: 5,
    rejectedBallots: 15,
    validVotes: 400,
    candidates: [
      { ballotNumber: 1, candidateName: 'William Ruto', partyAbbreviation: 'UDA', votes: 220 },
      { ballotNumber: 2, candidateName: 'Raila Odinga', partyAbbreviation: 'ODM', votes: 150 },
      { ballotNumber: 3, candidateName: 'George Wajackoyah', partyAbbreviation: 'RBK', votes: 30 },
    ],
    presidingOfficerName: 'Jane Akinyi',
  };

  const mockCapsule: Partial<EvidenceCapsule> = {
    id: 'capsule-uuid-001',
    tenantId: 'tenant-uuid-001',
    electionYear: 2027,
    positionCode: PositionCode.PRESIDENT,
    positionLevel: 'NATIONAL',
    iebcStationCode: '001001001000001',
    pollingStationName: 'Kisumu Primary School',
    wardCode: '0010',
    wardName: 'Kisumu Central',
    constituencyCode: '001',
    constituencyName: 'Kisumu Town East',
    countyCode: '001',
    countyName: 'Kisumu',
    streamNumber: 1,
    registeredVoters: 500,
    agentUserId: 'agent-uuid-001',
    agentDeviceId: 'device-uuid-001',
    status: CapsuleStatus.UPLOADED,
    sha256Hash: 'a'.repeat(64),
    s3ObjectKey: 'evidence/2027/001/001/001001001000001/PRESIDENT/agent-uuid-001/test.jpg',
    isDeleted: false,
    syncStatus: SyncStatus.UPLOADED,
    syncAttempts: 1,
    images: [],
    hashes: [],
    custodyEvents: [],
  };

  beforeEach(async () => {
    capsuleRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
        getRawMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({}),
      }),
    };

    imageRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    hashRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    custodyRepo = {
      find: vi.fn(),
      save: vi.fn(),
    };

    const mockManager = {
      create: vi.fn().mockImplementation((_, data) => ({ id: 'new-uuid', ...data })),
      save: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'new-uuid', ...data })),
      update: vi.fn().mockResolvedValue({}),
      query: vi.fn().mockResolvedValue([]),
    };

    dataSource = {
      transaction: vi.fn().mockImplementation(async (fn) => fn(mockManager)),
      query: vi.fn().mockResolvedValue([]),
    };

    configService = {
      get: vi.fn().mockImplementation((key: string, defaultVal?: string) => {
        const values: Record<string, string> = {
          AWS_REGION: 'us-east-1',
          S3_EVIDENCE_BUCKET: 'votecapsule-evidence-test',
          GEOGRAPHY_SERVICE_URL: 'http://localhost:3004',
          AI_SERVICE_URL: 'http://localhost:3006/api/v1/ai',
          TRUST_SERVICE_URL: 'http://localhost:3003/api/v1/trust',
        };
        return values[key] ?? defaultVal ?? '';
      }),
    };

    httpService = {
      get: vi.fn(),
      post: vi.fn(),
    };

    searchService = {
      indexCapsule: vi.fn().mockResolvedValue(undefined),
    };

    // Direct instantiation — avoids NestJS DI token-identity issues in pnpm monorepo
    service = new EvidenceService(
      capsuleRepo,
      imageRepo,
      hashRepo,
      custodyRepo,
      dataSource,
      configService,
      httpService,
      searchService,
    );
  });

  // ── getCapsule ───────────────────────────────────────────────

  describe('getCapsule', () => {
    it('returns capsule when found', async () => {
      capsuleRepo.findOne.mockResolvedValue(mockCapsule);

      const result = await service.getCapsule('capsule-uuid-001');
      expect(result).toEqual(mockCapsule);
      expect(capsuleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'capsule-uuid-001', isDeleted: false },
        relations: ['images', 'hashes', 'custodyEvents'],
      });
    });

    it('throws NotFoundException for non-existent capsule', async () => {
      capsuleRepo.findOne.mockResolvedValue(null);

      await expect(service.getCapsule('non-existent-id'))
        .rejects
        .toThrow('not found');
    });
  });

  // ── submitTally ──────────────────────────────────────────────

  describe('submitTally', () => {
    beforeEach(() => {
      capsuleRepo.findOne.mockResolvedValue({ ...mockCapsule });
      capsuleRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data }));
    });

    it('with all rules passing returns tallyValidationStatus = VALID', async () => {
      const result = await service.submitTally(
        'capsule-uuid-001',
        validTallyDto as any,
        'agent-uuid-001',
      );

      expect(result.tallyValidationStatus).toBe('VALID');
      expect(result.formType).toBe('FORM_34A');
      expect(result.validVotesForm).toBe(400);
      expect(result.ballotsIssued).toBe(420);
    });

    it('with sum(candidates) != validVotes returns CANDIDATE_SUM_MISMATCH', async () => {
      const badDto = {
        ...validTallyDto,
        candidates: [
          { ballotNumber: 1, candidateName: 'Candidate A', partyAbbreviation: 'UDA', votes: 200 },
          { ballotNumber: 2, candidateName: 'Candidate B', partyAbbreviation: 'ODM', votes: 150 },
          // sum = 350, but validVotes = 400 => MISMATCH
        ],
      };

      const result = await service.submitTally('capsule-uuid-001', badDto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('CANDIDATE_SUM_MISMATCH');
    });

    it('with validVotes > registeredVoters returns TURNOUT_EXCEEDED', async () => {
      const badDto = {
        ...validTallyDto,
        registeredVoters: 300, // lower than validVotes=400
        // Fix ballotsIssued so INTERNAL_MISMATCH doesn't fire first
        ballotsIssued: 500,    // 500 > 300 => TURNOUT_EXCEEDED (checked first)
      };

      const result = await service.submitTally('capsule-uuid-001', badDto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('TURNOUT_EXCEEDED');
    });

    it('with ballotsIssued != validVotes + rejected + spoilt returns INTERNAL_MISMATCH', async () => {
      const badDto = {
        ...validTallyDto,
        ballotsIssued: 450, // should be 400 + 15 + 5 = 420
        // ballotsIssued (450) <= registeredVoters (500) so TURNOUT_EXCEEDED won't fire
      };

      const result = await service.submitTally('capsule-uuid-001', badDto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('INTERNAL_MISMATCH');
    });

    it('rejects non-existent capsule with NotFoundException', async () => {
      capsuleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submitTally('non-existent-id', validTallyDto as any, 'agent-001'),
      ).rejects.toThrow('not found');
    });

    it('rejects capsule in DRAFT status with BadRequestException', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        status: CapsuleStatus.DRAFT,
      });

      await expect(
        service.submitTally('capsule-uuid-001', validTallyDto as any, 'agent-001'),
      ).rejects.toThrow('Cannot submit tally');
    });

    it('rejects capsule in REJECTED status with BadRequestException', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        status: CapsuleStatus.REJECTED,
      });

      await expect(
        service.submitTally('capsule-uuid-001', validTallyDto as any, 'agent-001'),
      ).rejects.toThrow('Cannot submit tally');
    });

    it('accepts capsule in APPROVED status (allowed for late tally entry)', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        status: CapsuleStatus.APPROVED,
      });

      const result = await service.submitTally(
        'capsule-uuid-001',
        validTallyDto as any,
        'agent-001',
      );
      expect(result.tallyValidationStatus).toBe('VALID');
    });

    it('accepts capsule in ANCHORED status', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        status: CapsuleStatus.ANCHORED,
      });

      const result = await service.submitTally(
        'capsule-uuid-001',
        validTallyDto as any,
        'agent-001',
      );
      expect(result.tallyValidationStatus).toBe('VALID');
    });

    it('stores tally data correctly in capsule fields', async () => {
      const result = await service.submitTally(
        'capsule-uuid-001',
        validTallyDto as any,
        'agent-001',
      );

      expect(result.registeredVotersForm).toBe(500);
      expect(result.ballotsIssued).toBe(420);
      expect(result.spoiltBallots).toBe(5);
      expect(result.rejectedBallotsForm).toBe(15);
      expect(result.validVotesForm).toBe(400);
    });

    it('indexes capsule in OpenSearch after tally submission', async () => {
      await service.submitTally('capsule-uuid-001', validTallyDto as any, 'agent-001');

      // OpenSearch indexing is fire-and-forget, give it a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(searchService.indexCapsule).toHaveBeenCalled();
    });
  });

  // ── validateTallyMath edge cases ─────────────────────────────

  describe('validateTallyMath (via submitTally)', () => {
    beforeEach(() => {
      capsuleRepo.findOne.mockResolvedValue({ ...mockCapsule });
      capsuleRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data }));
    });

    it('zero votes scenario is VALID when all sums balance', async () => {
      const zeroDto = {
        formType: 'FORM_34A',
        registeredVoters: 500,
        ballotsIssued: 0,
        spoiltBallots: 0,
        rejectedBallots: 0,
        validVotes: 0,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', partyAbbreviation: 'X', votes: 0 },
        ],
        presidingOfficerName: 'Officer',
      };

      const result = await service.submitTally('capsule-uuid-001', zeroDto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('VALID');
    });

    it('exact boundary: ballotsIssued == registeredVoters is VALID (100% turnout)', async () => {
      const dto = {
        formType: 'FORM_34A',
        registeredVoters: 420,
        ballotsIssued: 420, // exactly equals registeredVoters
        spoiltBallots: 5,
        rejectedBallots: 15,
        validVotes: 400,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', partyAbbreviation: 'X', votes: 400 },
        ],
        presidingOfficerName: 'Officer',
      };

      const result = await service.submitTally('capsule-uuid-001', dto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('VALID');
    });

    it('ballotsIssued exceeds registeredVoters by 1 returns TURNOUT_EXCEEDED', async () => {
      const dto = {
        formType: 'FORM_34A',
        registeredVoters: 419, // 420 > 419
        ballotsIssued: 420,
        spoiltBallots: 5,
        rejectedBallots: 15,
        validVotes: 400,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', partyAbbreviation: 'X', votes: 400 },
        ],
        presidingOfficerName: 'Officer',
      };

      const result = await service.submitTally('capsule-uuid-001', dto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('TURNOUT_EXCEEDED');
    });

    it('single candidate with all valid votes is VALID', async () => {
      const dto = {
        formType: 'FORM_35A',
        registeredVoters: 1000,
        ballotsIssued: 700,
        spoiltBallots: 10,
        rejectedBallots: 20,
        validVotes: 670,
        candidates: [
          { ballotNumber: 1, candidateName: 'Sole Candidate', partyAbbreviation: 'IND', votes: 670 },
        ],
        presidingOfficerName: 'Officer',
      };

      const result = await service.submitTally('capsule-uuid-001', dto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('VALID');
    });

    it('TURNOUT_EXCEEDED takes priority over INTERNAL_MISMATCH', async () => {
      // Both conditions true: ballotsIssued > registeredVoters AND ballotsIssued != sum
      const dto = {
        formType: 'FORM_34A',
        registeredVoters: 100,
        ballotsIssued: 500, // > 100 registeredVoters (TURNOUT check is first)
        spoiltBallots: 5,
        rejectedBallots: 15,
        validVotes: 400,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', partyAbbreviation: 'X', votes: 400 },
        ],
        presidingOfficerName: 'Officer',
      };

      const result = await service.submitTally('capsule-uuid-001', dto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('TURNOUT_EXCEEDED');
    });

    it('INTERNAL_MISMATCH takes priority over CANDIDATE_SUM_MISMATCH', async () => {
      // ballotsIssued != sum of (valid + rejected + spoilt) AND candidate sum != validVotes
      const dto = {
        formType: 'FORM_34A',
        registeredVoters: 1000,
        ballotsIssued: 500, // != 400 + 15 + 5 = 420
        spoiltBallots: 5,
        rejectedBallots: 15,
        validVotes: 400,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', partyAbbreviation: 'X', votes: 300 }, // sum=300 != 400
        ],
        presidingOfficerName: 'Officer',
      };

      const result = await service.submitTally('capsule-uuid-001', dto as any, 'agent-001');
      expect(result.tallyValidationStatus).toBe('INTERNAL_MISMATCH');
    });
  });

  // ── submitCapsule (createCapsule flow) ──────────────────────

  describe('submitCapsule', () => {
    const imageBuffer = Buffer.from('test-image-data');
    const metadata = {
      iebcStationCode: '001001001000001',
      positionCode: 'PRESIDENT',
      electionYear: 2027,
      streamNumber: 1,
      captureTimestamp: '2027-08-09T06:00:00.000Z',
      agentDeviceId: 'device-uuid-001',
      imageIndex: 0,
    };
    const { hashValue } = computeCompositeHash({ imageBytes: imageBuffer, metadata });

    const submitDto = {
      tenantId: 'tenant-uuid-001',
      iebcStationCode: '001001001000001',
      positionCode: 'PRESIDENT',
      electionYear: 2027,
      capturedAt: '2027-08-09T06:00:00.000Z',
      sha256Hash: hashValue,
    };

    const stationResponse = {
      id: 1,
      iebcStationCode: '001001001000001',
      streamNumber: 1,
      name: 'Kisumu Primary School',
      registeredVoters: 500,
      centreName: 'Kisumu Centre',
      wardName: 'Kisumu Central',
      wardCode: '0010',
      constituencyName: 'Kisumu Town East',
      constituencyCode: '001',
      countyName: 'Kisumu',
      countyCode: '001',
      active: true,
      stationType: 'GENERAL',
    };

    beforeEach(() => {
      // Geography service validates the station
      httpService.get.mockReturnValue(of({ data: stationResponse }));
      // No duplicate
      capsuleRepo.findOne.mockResolvedValue(null);
      // AI trigger returns 200
      httpService.post.mockReturnValue(of({ data: { queued: true } }));
    });

    it('creates capsule with UPLOADED status', async () => {
      const result = await service.submitCapsule(
        submitDto as any,
        imageBuffer,
        'agent-uuid-001',
        'device-uuid-001',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(CapsuleStatus.UPLOADED);
    });

    it('rejects submission with tampered hash', async () => {
      const tamperedDto = { ...submitDto, sha256Hash: 'b'.repeat(64) };

      await expect(
        service.submitCapsule(tamperedDto as any, imageBuffer, 'agent-uuid-001', 'device-uuid-001'),
      ).rejects.toThrow('hash mismatch');
    });

    it('rejects invalid station code format (not 15 digits)', async () => {
      const badDto = { ...submitDto, iebcStationCode: '12345' };

      await expect(
        service.submitCapsule(badDto as any, imageBuffer, 'agent-uuid-001', 'device-uuid-001'),
      ).rejects.toThrow('Invalid IEBC station code');
    });

    it('rejects inactive polling station', async () => {
      httpService.get.mockReturnValue(of({ data: { ...stationResponse, active: false } }));

      await expect(
        service.submitCapsule(submitDto as any, imageBuffer, 'agent-uuid-001', 'device-uuid-001'),
      ).rejects.toThrow('not active');
    });

    it('rejects station not found in NEC database (404 from Geography)', async () => {
      httpService.get.mockReturnValue(throwError(() => ({ response: { status: 404 } })));

      await expect(
        service.submitCapsule(submitDto as any, imageBuffer, 'agent-uuid-001', 'device-uuid-001'),
      ).rejects.toThrow('not found in NEC database');
    });

    it('rejects duplicate submission (same station + position + election)', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        agentUserId: 'different-agent-uuid', // different agent
        status: CapsuleStatus.UPLOADED,
      });

      await expect(
        service.submitCapsule(submitDto as any, imageBuffer, 'agent-uuid-001', 'device-uuid-001'),
      ).rejects.toThrow('already exists');
    });

    it('triggers AI verification after successful submission', async () => {
      await service.submitCapsule(
        submitDto as any,
        imageBuffer,
        'agent-uuid-001',
        'device-uuid-001',
      );

      // AI trigger is fire-and-forget, give it a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/verify'),
        expect.objectContaining({ iebcStationCode: '001001001000001' }),
        expect.any(Object),
      );
    });
  });

  // ── triggerAiVerification ────────────────────────────────────

  describe('triggerAiVerification (via submitCapsule)', () => {
    it('calls AI service HTTP POST with correct payload', async () => {
      const imageBuffer = Buffer.from('ai-test-image');
      const metadata = {
        iebcStationCode: '001001001000001',
        positionCode: 'PRESIDENT',
        electionYear: 2027,
        streamNumber: 1,
        captureTimestamp: '2027-08-09T06:00:00.000Z',
        agentDeviceId: 'device-uuid-001',
        imageIndex: 0,
      };
      const { hashValue } = computeCompositeHash({ imageBytes: imageBuffer, metadata });

      const stationResponse = {
        id: 1, iebcStationCode: '001001001000001', streamNumber: 1,
        name: 'Test Station', registeredVoters: 500, centreName: 'Centre',
        wardName: 'Ward', wardCode: '0010', constituencyName: 'Constituency',
        constituencyCode: '001', countyName: 'County', countyCode: '001',
        active: true, stationType: 'GENERAL',
      };

      httpService.get.mockReturnValue(of({ data: stationResponse }));
      capsuleRepo.findOne.mockResolvedValue(null);
      httpService.post.mockReturnValue(of({ data: { queued: true } }));

      await service.submitCapsule(
        {
          tenantId: 'tenant-uuid-001', iebcStationCode: '001001001000001',
          positionCode: 'PRESIDENT', electionYear: 2027,
          capturedAt: '2027-08-09T06:00:00.000Z', sha256Hash: hashValue,
        } as any,
        imageBuffer,
        'agent-uuid-001',
        'device-uuid-001',
      );

      await new Promise((r) => setTimeout(r, 10));

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3006/api/v1/ai/verify',
        expect.objectContaining({
          positionCode: 'PRESIDENT',
          electionYear: 2027,
          s3Bucket: 'votecapsule-evidence-test',
        }),
        expect.objectContaining({
          headers: { 'x-internal-service': 'evidence-service' },
          timeout: 5000,
        }),
      );
    });
  });

  // ── queueForTrustAnchor ──────────────────────────────────────

  describe('queueForTrustAnchor (via approveOrReject)', () => {
    it('calls Trust service HTTP POST when capsule is APPROVED', async () => {
      const pendingCapsule = {
        ...mockCapsule,
        status: CapsuleStatus.PENDING_VALIDATION,
      };
      const approvedCapsule = { ...mockCapsule, status: CapsuleStatus.APPROVED };
      capsuleRepo.findOne
        .mockResolvedValueOnce(pendingCapsule)   // getCapsule #1: pre-check in approveOrReject
        .mockResolvedValue(approvedCapsule);     // all subsequent calls: queueForTrustAnchor, re-index, final return

      hashRepo.findOne.mockResolvedValue({
        hashValue: 'a'.repeat(64),
        capsuleId: 'capsule-uuid-001',
        hashType: 'CAPSULE_COMPOSITE',
      });

      httpService.post.mockReturnValue(of({ data: { queued: true } }));

      await service.approveOrReject(
        'capsule-uuid-001',
        'APPROVED',
        'validator-uuid-001',
        'Looks correct',
      );

      await new Promise((r) => setTimeout(r, 10));

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/api/v1/trust/anchor',
        expect.objectContaining({
          capsuleId: 'capsule-uuid-001',
          sha256Hash: 'a'.repeat(64),
          requestedByService: 'evidence-service',
          validatorUserId: 'validator-uuid-001',
        }),
        expect.objectContaining({
          headers: { 'x-internal-service': 'evidence-service' },
          timeout: 5000,
        }),
      );
    });
  });

  // ── approveOrReject ──────────────────────────────────────────

  describe('approveOrReject', () => {
    it('rejects capsule not in PENDING_VALIDATION status', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        status: CapsuleStatus.UPLOADED,
      });

      await expect(
        service.approveOrReject('capsule-uuid-001', 'APPROVED', 'validator-001'),
      ).rejects.toThrow('expected PENDING_VALIDATION');
    });
  });

  // ── recordAnchorCallback ─────────────────────────────────────

  describe('recordAnchorCallback', () => {
    it('ignores callback for capsule not in APPROVED status', async () => {
      capsuleRepo.findOne.mockResolvedValue({
        ...mockCapsule,
        status: CapsuleStatus.UPLOADED,
      });

      // Should not throw
      await service.recordAnchorCallback(
        'capsule-uuid-001',
        'batch-uuid-001',
        'DUAL_ANCHORED',
      );

      // Transaction should NOT be called since status is wrong
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
