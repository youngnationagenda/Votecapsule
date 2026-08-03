// AI ASSISTS, HUMANS DECIDE — tests verify AI callbacks but never automate final decisions
// Coverage: mobile submit → SHA-256 verification → AI routing → human validation → trust anchor

import { describe, it, expect, vi, beforeEach, waitFor } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

// Hoist S3 mock before any module imports the AWS SDK
const mockS3Send = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client:                  vi.fn(() => ({ send: mockS3Send })),
  PutObjectCommand:          vi.fn(),
  PutObjectRetentionCommand: vi.fn(),
  ObjectLockRetentionMode:   { COMPLIANCE: 'COMPLIANCE' },
}));

import { EvidenceService } from './evidence.service';
import { EvidenceCapsule, CapsuleStatus, PositionCode } from './entities/evidence-capsule.entity';
import { EvidenceImage }       from './entities/evidence-image.entity';
import { EvidenceHash }        from './entities/evidence-hash.entity';
import { EvidenceChainOfCustody, CustodyEventType } from './entities/evidence-chain-of-custody.entity';
import { computeCompositeHash } from './utils/sha256.util';
import type { SubmitCapsuleDto } from './dto/submit-capsule.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TENANT_ID    = '11111111-1111-1111-1111-111111111111';
const AGENT_ID     = '22222222-2222-2222-2222-222222222222';
const DEVICE_ID    = '33333333-3333-3333-3333-333333333333';
const CAPSULE_ID   = '44444444-4444-4444-4444-444444444444';
const VALIDATOR_ID = '55555555-5555-5555-5555-555555555555';
const BATCH_ID     = '66666666-6666-6666-6666-666666666666';
const STATION_CODE = '001001000100101'; // 15-digit IEBC code
const CAPTURED_AT  = '2027-08-09T06:00:00.000Z';
const IMAGE_BUF    = Buffer.from('test-jpeg-bytes');

const STATION = {
  id: 1, iebcStationCode: STATION_CODE, streamNumber: 1,
  name: 'Nairobi Central 1', registeredVoters: 512,
  centreName: 'NBI Centre', wardName: 'Central Ward', wardCode: '0011',
  constituencyName: 'Nairobi Central', constituencyCode: '001',
  countyName: 'Nairobi', countyCode: '001',
  active: true, stationType: 'REGULAR',
};

function validHash(): string {
  return computeCompositeHash({
    imageBytes: IMAGE_BUF,
    metadata: {
      iebcStationCode: STATION_CODE, positionCode: PositionCode.PRESIDENT,
      electionYear: 2027, streamNumber: STATION.streamNumber,
      captureTimestamp: CAPTURED_AT, agentDeviceId: DEVICE_ID, imageIndex: 0,
    },
  }).hashValue;
}

function submitDto(overrides: Partial<SubmitCapsuleDto> = {}): SubmitCapsuleDto {
  return {
    tenantId: TENANT_ID, iebcStationCode: STATION_CODE,
    positionCode: PositionCode.PRESIDENT, electionYear: 2027,
    sha256Hash: validHash(), capturedAt: CAPTURED_AT,
    ...overrides,
  } as SubmitCapsuleDto;
}

function fakeCapsule(status: CapsuleStatus): Partial<EvidenceCapsule> {
  return {
    id: CAPSULE_ID, tenantId: TENANT_ID, iebcStationCode: STATION_CODE,
    positionCode: PositionCode.PRESIDENT, electionYear: 2027,
    agentUserId: AGENT_ID, status, isDeleted: false,
    sha256Hash: validHash(),
    s3ObjectKey: `evidence/2027/001/001/${STATION_CODE}/PRESIDENT/${AGENT_ID}/t.jpg`,
    wardCode: '0011', wardName: 'Central Ward',
    constituencyCode: '001', constituencyName: 'Nairobi Central',
    countyCode: '001', countyName: 'Nairobi',
    images: [], hashes: [], custodyEvents: [],
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────
describe('Evidence pipeline — integration', () => {
  let svc: EvidenceService;
  let capsuleRepo: ReturnType<typeof makeRepo>;
  let hashRepo:    ReturnType<typeof makeRepo>;
  let custodyRepo: ReturnType<typeof makeRepo>;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;

  // Shared transaction manager
  const mgr = {
    create: vi.fn((_, d: object) => ({ id: CAPSULE_ID, ...d })),
    save:   vi.fn(async (e: object) => ({ id: CAPSULE_ID, ...e })),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const ds = { transaction: vi.fn(async (cb: Function) => cb(mgr)) };

  function makeQB(rawRows: object[] = []) {
    const q: Record<string, Function> = {};
    for (const m of ['select', 'addSelect', 'where', 'andWhere', 'groupBy', 'orderBy']) {
      q[m] = vi.fn(() => q);
    }
    q.update      = vi.fn(() => q);
    q.set         = vi.fn(() => q);
    q.execute     = vi.fn().mockResolvedValue({});
    q.getRawMany  = vi.fn().mockResolvedValue(rawRows);
    q.getMany     = vi.fn().mockResolvedValue([]);
    return q;
  }

  function makeRepo() {
    return {
      findOne:            vi.fn().mockResolvedValue(null),
      find:               vi.fn().mockResolvedValue([]),
      save:               vi.fn(async (e: object) => ({ id: CAPSULE_ID, ...e })),
      create:             vi.fn((d: object) => d),
      update:             vi.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: vi.fn(() => makeQB()),
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    capsuleRepo = makeRepo();
    hashRepo    = makeRepo();
    custodyRepo = makeRepo();
    const imageRepo = makeRepo();
    httpGet  = vi.fn().mockReturnValue(of({ data: STATION }));
    httpPost = vi.fn().mockReturnValue(of({ data: {} }));
    mockS3Send.mockResolvedValue({});
    ds.transaction.mockImplementation(async (cb: Function) => cb(mgr));
    mgr.create.mockImplementation((_, d: object) => ({ id: CAPSULE_ID, ...d }));
    mgr.save.mockImplementation(async (e: object) => ({ id: CAPSULE_ID, ...e }));
    mgr.update.mockResolvedValue({ affected: 1 });

    const module = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: getRepositoryToken(EvidenceCapsule),        useValue: capsuleRepo },
        { provide: getRepositoryToken(EvidenceImage),          useValue: imageRepo   },
        { provide: getRepositoryToken(EvidenceHash),           useValue: hashRepo    },
        { provide: getRepositoryToken(EvidenceChainOfCustody), useValue: custodyRepo },
        { provide: DataSource, useValue: ds },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: string) =>
              key === 'AWS_REGION' ? 'us-east-1' : key === 'S3_EVIDENCE_BUCKET' ? 'test-bucket' : def ?? 'http://mock',
          },
        },
        { provide: HttpService, useValue: { get: httpGet, post: httpPost } },
      ],
    }).compile();

    svc = module.get(EvidenceService);
  });

  // 1. Auth + station validation ───────────────────────────────────────────────

  it('rejects inactive station — no S3 upload, no AI trigger', async () => {
    httpGet.mockReturnValue(of({ data: { ...STATION, active: false } }));
    await expect(svc.submitCapsule(submitDto(), IMAGE_BUF, AGENT_ID, DEVICE_ID))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it('rejects submission when Geography Service returns 404 for unknown station', async () => {
    httpGet.mockReturnValue(throwError(() => ({ response: { status: 404 } })));
    await expect(svc.submitCapsule(submitDto(), IMAGE_BUF, AGENT_ID, DEVICE_ID))
      .rejects.toThrow();
  });

  // 2. Submit capsule — happy path ─────────────────────────────────────────────

  it('returns capsule UUID, status=UPLOADED, sha256Hash stored, S3 uploaded, AI triggered', async () => {
    const result = await svc.submitCapsule(submitDto(), IMAGE_BUF, AGENT_ID, DEVICE_ID);

    expect(result.id).toBe(CAPSULE_ID);
    expect(result.sha256Hash).toBe(validHash());
    expect(result.status).toBe(CapsuleStatus.UPLOADED);
    expect(mockS3Send).toHaveBeenCalledOnce();
    expect(mgr.create).toHaveBeenCalledWith(
      EvidenceChainOfCustody,
      expect.objectContaining({ eventType: CustodyEventType.CREATED }),
    );
    await waitFor(() => expect(httpPost).toHaveBeenCalled());
  });

  // 3. Hash verification — wrong SHA-256 ───────────────────────────────────────

  it('rejects tampered payload (wrong SHA-256) with 400 — no S3, no AI, no DB write', async () => {
    const badHash = 'deadbeef'.repeat(8);
    await expect(svc.submitCapsule(submitDto({ sha256Hash: badHash }), IMAGE_BUF, AGENT_ID, DEVICE_ID))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockS3Send).not.toHaveBeenCalled();
    expect(httpPost).not.toHaveBeenCalled();
    expect(ds.transaction).not.toHaveBeenCalled();
  });

  // 4. Duplicate detection ──────────────────────────────────────────────────────

  it('returns 409 when same agent resubmits same station+position (non-REJECTED)', async () => {
    capsuleRepo.findOne.mockResolvedValue(fakeCapsule(CapsuleStatus.UPLOADED));
    await expect(svc.submitCapsule(submitDto(), IMAGE_BUF, AGENT_ID, DEVICE_ID))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 409 when different agent submits same station+position', async () => {
    capsuleRepo.findOne.mockResolvedValue({ ...fakeCapsule(CapsuleStatus.UPLOADED), agentUserId: 'other-agent' });
    await expect(svc.submitCapsule(submitDto(), IMAGE_BUF, AGENT_ID, DEVICE_ID))
      .rejects.toBeInstanceOf(ConflictException);
  });

  // 5. AI result callback → PENDING_VALIDATION ──────────────────────────────────

  it('MANUAL_REVIEW: status→PENDING_VALIDATION, aiFlagged=true, AI_COMPLETED custody event', async () => {
    capsuleRepo.findOne.mockResolvedValue(fakeCapsule(CapsuleStatus.UPLOADED));
    await svc.recordAiResult(CAPSULE_ID, 'MANUAL_REVIEW');
    expect(mgr.update).toHaveBeenCalledWith(EvidenceCapsule, CAPSULE_ID,
      expect.objectContaining({ status: CapsuleStatus.PENDING_VALIDATION, aiFlagged: true }),
    );
    expect(mgr.create).toHaveBeenCalledWith(EvidenceChainOfCustody,
      expect.objectContaining({ eventType: CustodyEventType.AI_COMPLETED }),
    );
  });

  it('APPROVE_FOR_REVIEW: status→PENDING_VALIDATION, aiFlagged=false', async () => {
    capsuleRepo.findOne.mockResolvedValue(fakeCapsule(CapsuleStatus.UPLOADED));
    await svc.recordAiResult(CAPSULE_ID, 'APPROVE_FOR_REVIEW');
    expect(mgr.update).toHaveBeenCalledWith(EvidenceCapsule, CAPSULE_ID,
      expect.objectContaining({ status: CapsuleStatus.PENDING_VALIDATION, aiFlagged: false }),
    );
  });

  // 6. Validator approval ───────────────────────────────────────────────────────

  it('approves capsule: status→APPROVED, validatedBy set, VALIDATION_APPROVED event, trust queued', async () => {
    capsuleRepo.findOne
      .mockResolvedValueOnce(fakeCapsule(CapsuleStatus.PENDING_VALIDATION)) // getCapsule (pre-check)
      .mockResolvedValueOnce(fakeCapsule(CapsuleStatus.APPROVED))           // getCapsule (queueForTrustAnchor)
      .mockResolvedValueOnce(fakeCapsule(CapsuleStatus.APPROVED));          // getCapsule (final return)
    hashRepo.findOne.mockResolvedValue({
      id: 'h1', capsuleId: CAPSULE_ID, hashType: 'CAPSULE_COMPOSITE', hashValue: validHash(),
    });

    const result = await svc.approveOrReject(CAPSULE_ID, 'APPROVED', VALIDATOR_ID);

    expect(result.status).toBe(CapsuleStatus.APPROVED);
    expect(mgr.update).toHaveBeenCalledWith(EvidenceCapsule, CAPSULE_ID,
      expect.objectContaining({
        status: CapsuleStatus.APPROVED, validationDecision: 'APPROVED',
        validatedBy: VALIDATOR_ID, validatedAt: expect.any(Date),
      }),
    );
    expect(mgr.create).toHaveBeenCalledWith(EvidenceChainOfCustody,
      expect.objectContaining({ eventType: CustodyEventType.VALIDATION_APPROVED }),
    );
    await waitFor(() => expect(httpPost).toHaveBeenCalledWith(
      expect.stringContaining('/anchor'),
      expect.objectContaining({ capsuleId: CAPSULE_ID }),
      expect.any(Object),
    ));
  });

  // 7. Trust anchor callback ────────────────────────────────────────────────────

  it('DUAL_ANCHORED: status→ANCHORED, anchoredAt set, batchId stored, S3 Object Lock applied', async () => {
    capsuleRepo.findOne.mockResolvedValue(fakeCapsule(CapsuleStatus.APPROVED));
    await svc.recordAnchorCallback(CAPSULE_ID, BATCH_ID, 'DUAL_ANCHORED');
    expect(mgr.update).toHaveBeenCalledWith(EvidenceCapsule, CAPSULE_ID,
      expect.objectContaining({
        status: CapsuleStatus.ANCHORED, trustAnchorBatchId: BATCH_ID,
        anchorStatus: 'DUAL_ANCHORED', anchoredAt: expect.any(Date),
      }),
    );
    expect(mgr.create).toHaveBeenCalledWith(EvidenceChainOfCustody,
      expect.objectContaining({ eventType: CustodyEventType.TRUST_ANCHORED }),
    );
    expect(mockS3Send).toHaveBeenCalledOnce(); // PutObjectRetentionCommand (COMPLIANCE, 10yr)
  });

  // 8. Rejection flow ───────────────────────────────────────────────────────────

  it('rejects capsule: status→REJECTED, VALIDATION_REJECTED event, trust NOT triggered', async () => {
    capsuleRepo.findOne
      .mockResolvedValueOnce(fakeCapsule(CapsuleStatus.PENDING_VALIDATION))
      .mockResolvedValueOnce(fakeCapsule(CapsuleStatus.REJECTED));

    const result = await svc.approveOrReject(CAPSULE_ID, 'REJECTED', VALIDATOR_ID, 'Forms missing');

    expect(result.status).toBe(CapsuleStatus.REJECTED);
    expect(mgr.create).toHaveBeenCalledWith(EvidenceChainOfCustody,
      expect.objectContaining({ eventType: CustodyEventType.VALIDATION_REJECTED }),
    );
    await new Promise<void>((r) => setTimeout(r, 20)); // drain event loop
    expect(httpPost).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  // 9. Chain of custody ─────────────────────────────────────────────────────────

  it('returns all events in chronological order with correct types', async () => {
    capsuleRepo.findOne.mockResolvedValue(fakeCapsule(CapsuleStatus.ANCHORED));
    const t = (s: number) => new Date(Date.parse(CAPTURED_AT) + s * 1000);
    const events = [
      { id: 'e1', capsuleId: CAPSULE_ID, eventType: CustodyEventType.CREATED,             eventTimestamp: t(0) },
      { id: 'e2', capsuleId: CAPSULE_ID, eventType: CustodyEventType.UPLOADED,            eventTimestamp: t(10) },
      { id: 'e3', capsuleId: CAPSULE_ID, eventType: CustodyEventType.HASH_VERIFIED,       eventTimestamp: t(11) },
      { id: 'e4', capsuleId: CAPSULE_ID, eventType: CustodyEventType.AI_COMPLETED,        eventTimestamp: t(120) },
      { id: 'e5', capsuleId: CAPSULE_ID, eventType: CustodyEventType.VALIDATION_APPROVED, eventTimestamp: t(3600) },
      { id: 'e6', capsuleId: CAPSULE_ID, eventType: CustodyEventType.TRUST_ANCHORED,      eventTimestamp: t(7200) },
    ];
    custodyRepo.find.mockResolvedValue(events);

    const chain = await svc.getChainOfCustody(CAPSULE_ID);

    expect(chain).toHaveLength(6);
    expect(chain[0].eventType).toBe(CustodyEventType.CREATED);
    expect(chain[5].eventType).toBe(CustodyEventType.TRUST_ANCHORED);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].eventTimestamp.getTime()).toBeGreaterThan(chain[i - 1].eventTimestamp.getTime());
    }
    expect(custodyRepo.find).toHaveBeenCalledWith({
      where: { capsuleId: CAPSULE_ID }, order: { eventTimestamp: 'ASC' },
    });
  });

  // 10. Stats endpoint ──────────────────────────────────────────────────────────

  it('returns capsule counts keyed by status', async () => {
    const qb = makeQB([
      { status: 'UPLOADED', count: '12' }, { status: 'PENDING_VALIDATION', count: '5' },
      { status: 'APPROVED', count: '30' }, { status: 'ANCHORED', count: '28' },
      { status: 'REJECTED', count: '2'  },
    ]);
    capsuleRepo.createQueryBuilder.mockReturnValue(qb);

    const stats = await svc.getStats();

    expect(stats).toEqual({
      UPLOADED: 12, PENDING_VALIDATION: 5, APPROVED: 30, ANCHORED: 28, REJECTED: 2,
    });
  });

  it('filters stats by tenantId when provided', async () => {
    const qb = makeQB([{ status: 'APPROVED', count: '10' }]);
    capsuleRepo.createQueryBuilder.mockReturnValue(qb);

    const stats = await svc.getStats(TENANT_ID);

    expect(stats).toEqual({ APPROVED: 10 });
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('tenantId'), expect.objectContaining({ t: TENANT_ID }),
    );
  });
});
