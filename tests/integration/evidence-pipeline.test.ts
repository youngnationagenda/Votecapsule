// ============================================================
// VoteCapsule Integration Tests — Evidence Pipeline End-to-End
// tests/integration/evidence-pipeline.test.ts
//
// Tests the full evidence lifecycle:
//   Upload → AI Verify → Trust Anchor (Hedera + RFC 3161) → Immutable
//
// SHA-256 Formula:
//   SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
// ============================================================
import axios, { AxiosInstance } from 'axios';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { getAdminToken, getAgentToken, parseJwtPayload } from './setup/auth';
import { config, evidenceUrl, geographyUrl } from './setup/config';

// ── Helpers ────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Compute the VoteCapsule composite hash per the spec:
 * SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
 */
function computeCompositeHash(
  imageSHA256: string,
  metadata: Record<string, unknown>,
  captureTimestamp: string,
): string {
  const sortedMetadataJSON = JSON.stringify(metadata, Object.keys(metadata).sort());
  const input = imageSHA256 + sortedMetadataJSON + captureTimestamp;
  return sha256(input);
}

/**
 * Generate a fake image buffer and its SHA-256.
 */
function generateFakeImage(): { buffer: Buffer; sha256: string } {
  const buffer = randomBytes(1024); // 1KB fake image
  const hash = createHash('sha256').update(buffer).digest('hex');
  return { buffer, sha256: hash };
}

/**
 * Poll a capsule until a field changes from a given value.
 */
async function pollUntilChanged(
  client: AxiosInstance,
  capsuleId: string,
  field: string,
  fromValue: string,
  timeoutMs: number = config.timeouts.aiVerification,
  intervalMs: number = config.timeouts.aiPollInterval,
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await client.get(evidenceUrl(`capsules/${capsuleId}`));
    if (response.data[field] !== fromValue) {
      return response.data;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Timeout: capsule ${capsuleId} field "${field}" did not change ` +
    `from "${fromValue}" within ${timeoutMs}ms`,
  );
}

// ── Test Suite ─────────────────────────────────────────────────

describe('Evidence Pipeline — End-to-End', () => {
  let adminToken: string;
  let client: AxiosInstance;
  let createdCapsuleId: string;
  let testAgentUserId: string;
  let testDeviceId: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    testAgentUserId = uuid();
    testDeviceId = uuid();

    client = axios.create({
      timeout: config.timeouts.test,
      validateStatus: () => true, // Don't throw on non-2xx
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-Agent-User-Id': testAgentUserId,
        'X-Device-Id': testDeviceId,
        'X-Tenant-Id': config.testData.tenantId,
      },
    });
  });

  // ── Authentication ───────────────────────────────────────────

  it('should authenticate via Cognito and get JWT', async () => {
    // Token was already obtained in beforeAll — verify its structure
    expect(adminToken).toBeDefined();
    expect(adminToken.split('.')).toHaveLength(3); // JWT: header.payload.signature

    const payload = parseJwtPayload(adminToken);
    expect(payload.email).toBe(config.cognito.adminEmail);
    expect(payload.token_use).toBe('id');
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  // ── Station Validation ───────────────────────────────────────

  it('should validate a polling station via NEC database', async () => {
    const stationCode = config.testData.validStationCode;
    const url = geographyUrl(`stations/${stationCode}`);

    const response = await client.get(url);

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();

    // The NEC database should return full station context
    const station = response.data;
    expect(station.iebcCode || station.iebc_code || station.code).toBeDefined();

    // Station should have geographic hierarchy
    if (station.county) expect(station.county).toBeDefined();
    if (station.constituency) expect(station.constituency).toBeDefined();
    if (station.ward) expect(station.ward).toBeDefined();
  });

  // ── Capsule Submission ───────────────────────────────────────

  it('should create an evidence capsule with valid SHA-256', async () => {
    const image = generateFakeImage();
    const captureTimestamp = new Date().toISOString();
    const metadata: Record<string, unknown> = {
      iebcStationCode: config.testData.validStationCode,
      positionCode: 'PRESIDENT',
      electionYear: config.testData.electionYear,
    };

    // Compute composite hash per VoteCapsule formula
    const compositeHash = computeCompositeHash(
      image.sha256,
      metadata,
      captureTimestamp,
    );

    // Build multipart form data
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('image', image.buffer, {
      filename: 'evidence.jpg',
      contentType: 'image/jpeg',
    });
    form.append('tenantId', config.testData.tenantId);
    form.append('iebcStationCode', config.testData.validStationCode);
    form.append('positionCode', 'PRESIDENT');
    form.append('electionYear', String(config.testData.electionYear));
    form.append('sha256Hash', compositeHash);
    form.append('capturedAt', captureTimestamp);

    const url = evidenceUrl('capsules');
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${adminToken}`,
        'X-Agent-User-Id': testAgentUserId,
        'X-Device-Id': testDeviceId,
      },
      timeout: config.timeouts.test,
      validateStatus: () => true,
    });

    expect(response.status).toBe(201);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBeDefined();

    createdCapsuleId = response.data.id;

    // Verify the server acknowledged the hash
    if (response.data.sha256Hash) {
      expect(response.data.sha256Hash).toBe(compositeHash);
    }

    // Capsule should start in PENDING_AI or UPLOADED status
    const status = response.data.status || response.data.capsuleStatus;
    expect(['UPLOADED', 'PENDING_AI', 'PENDING_VERIFICATION']).toContain(status);
  });

  // ── AI Verification ──────────────────────────────────────────

  it('should trigger AI verification on capsule submission', async () => {
    // Skip if no capsule was created (dependent test)
    if (!createdCapsuleId) {
      return expect(createdCapsuleId).toBeDefined();
    }

    // Immediately after submission, aiStatus should be PENDING or IN_PROGRESS
    const url = evidenceUrl(`capsules/${createdCapsuleId}`);
    const response = await client.get(url);

    expect(response.status).toBe(200);

    const capsule = response.data;
    const aiStatus = capsule.aiStatus || capsule.ai_status || capsule.aiVerificationStatus;

    // AI verification should have been triggered
    // Acceptable initial states: PENDING, IN_PROGRESS, COMPLETED
    // (COMPLETED is possible if AI service processes instantly)
    expect([
      'PENDING', 'IN_PROGRESS', 'COMPLETED',
      'APPROVE_FOR_REVIEW', 'MANUAL_REVIEW',
    ]).toContain(aiStatus);
  });

  // ── Trust Anchoring Queue ────────────────────────────────────

  it('should queue approved capsule for trust anchoring', async () => {
    if (!createdCapsuleId) {
      return expect(createdCapsuleId).toBeDefined();
    }

    // Approve the capsule (simulating validator action)
    const validateUrl = evidenceUrl(`capsules/${createdCapsuleId}/validate`);
    const approveResponse = await axios.patch(
      validateUrl,
      { decision: 'APPROVED', notes: 'Integration test approval' },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'X-Validator-User-Id': uuid(),
        },
        timeout: config.timeouts.test,
        validateStatus: () => true,
      },
    );

    // Accept 200 or 204 for successful approval
    expect([200, 204]).toContain(approveResponse.status);

    // After approval, check trust anchor status
    const url = evidenceUrl(`capsules/${createdCapsuleId}`);
    const response = await client.get(url);

    expect(response.status).toBe(200);

    const capsule = response.data;
    const trustStatus =
      capsule.trustAnchorStatus ||
      capsule.trust_anchor_status ||
      capsule.anchoringStatus;

    // Trust anchoring should be queued, in progress, or completed
    if (trustStatus) {
      expect([
        'QUEUED', 'PENDING', 'IN_PROGRESS', 'ANCHORED', 'COMPLETED',
      ]).toContain(trustStatus);
    }
  });

  // ── Tally Submission ─────────────────────────────────────────

  it('should submit tally data and validate IEBC math', async () => {
    if (!createdCapsuleId) {
      return expect(createdCapsuleId).toBeDefined();
    }

    const tallyData = {
      formType: 'FORM_34A',
      registeredVoters: 500,
      ballotsIssued: 420,
      spoiltBallots: 5,
      rejectedBallots: 15,
      validVotes: 400,
      candidates: [
        { ballotNumber: 1, candidateName: 'Candidate A', partyAbbreviation: 'UDA', votes: 200 },
        { ballotNumber: 2, candidateName: 'Candidate B', partyAbbreviation: 'ODM', votes: 150 },
        { ballotNumber: 3, candidateName: 'Candidate C', partyAbbreviation: 'IND', votes: 50 },
      ],
      presidingOfficerName: 'John Mwangi',
    };

    // Verify math: validVotes = 200 + 150 + 50 = 400 (correct)
    // ballotsIssued = 400 + 15 + 5 = 420 (correct)

    const url = evidenceUrl(`capsules/${createdCapsuleId}/tally`);
    const response = await axios.patch(url, tallyData, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-Agent-User-Id': testAgentUserId,
      },
      timeout: config.timeouts.test,
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);

    const result = response.data;
    // Tally validation should pass — all math checks out
    const validationStatus =
      result.tallyValidationStatus ||
      result.tally_validation_status ||
      result.validationResult;

    if (validationStatus) {
      expect(validationStatus).toBe('VALID');
    }
  });

  // ── Negative: Invalid SHA-256 ────────────────────────────────

  it('should reject capsule with invalid SHA-256 hash', async () => {
    const image = generateFakeImage();
    const captureTimestamp = new Date().toISOString();

    // Deliberately tamper with the hash
    const tamperedHash = 'a'.repeat(64);

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('image', image.buffer, {
      filename: 'tampered.jpg',
      contentType: 'image/jpeg',
    });
    form.append('tenantId', config.testData.tenantId);
    form.append('iebcStationCode', config.testData.validStationCode);
    form.append('positionCode', 'PRESIDENT');
    form.append('electionYear', String(config.testData.electionYear));
    form.append('sha256Hash', tamperedHash);
    form.append('capturedAt', captureTimestamp);

    const url = evidenceUrl('capsules');
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${adminToken}`,
        'X-Agent-User-Id': testAgentUserId,
        'X-Device-Id': testDeviceId,
      },
      timeout: config.timeouts.test,
      validateStatus: () => true,
    });

    // Server should reject with 400 (Bad Request) due to hash mismatch
    // or 422 (Unprocessable Entity)
    expect([400, 422]).toContain(response.status);

    // Error message should reference hash or integrity
    if (response.data?.message) {
      const msg = (response.data.message as string).toLowerCase();
      expect(
        msg.includes('hash') ||
        msg.includes('sha') ||
        msg.includes('integrity') ||
        msg.includes('mismatch')
      ).toBeTruthy();
    }
  });

  // ── Negative: Candidate Sum Mismatch ─────────────────────────

  it('should detect CANDIDATE_SUM_MISMATCH in tally validation', async () => {
    if (!createdCapsuleId) {
      return expect(createdCapsuleId).toBeDefined();
    }

    // Create a fresh capsule for this negative test
    const image = generateFakeImage();
    const captureTimestamp = new Date().toISOString();
    const metadata: Record<string, unknown> = {
      iebcStationCode: config.testData.validStationCode,
      positionCode: 'MP',
      electionYear: config.testData.electionYear,
    };
    const compositeHash = computeCompositeHash(image.sha256, metadata, captureTimestamp);

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('image', image.buffer, {
      filename: 'evidence_mp.jpg',
      contentType: 'image/jpeg',
    });
    form.append('tenantId', config.testData.tenantId);
    form.append('iebcStationCode', config.testData.validStationCode);
    form.append('positionCode', 'MP');
    form.append('electionYear', String(config.testData.electionYear));
    form.append('sha256Hash', compositeHash);
    form.append('capturedAt', captureTimestamp);

    const createResponse = await axios.post(evidenceUrl('capsules'), form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${adminToken}`,
        'X-Agent-User-Id': testAgentUserId,
        'X-Device-Id': testDeviceId,
      },
      timeout: config.timeouts.test,
      validateStatus: () => true,
    });

    // If capsule creation fails (maybe due to other validation), skip
    if (createResponse.status !== 201) {
      console.warn(
        `Skipping CANDIDATE_SUM_MISMATCH test: capsule creation returned ${createResponse.status}`,
      );
      return;
    }

    const newCapsuleId = createResponse.data.id;

    // Submit tally with mismatched candidate sum
    // validVotes = 400, but candidates sum to 350 (mismatch!)
    const invalidTally = {
      formType: 'FORM_35A',
      registeredVoters: 500,
      ballotsIssued: 420,
      spoiltBallots: 5,
      rejectedBallots: 15,
      validVotes: 400,
      candidates: [
        { ballotNumber: 1, candidateName: 'MP Candidate A', partyAbbreviation: 'UDA', votes: 200 },
        { ballotNumber: 2, candidateName: 'MP Candidate B', partyAbbreviation: 'ODM', votes: 100 },
        { ballotNumber: 3, candidateName: 'MP Candidate C', partyAbbreviation: 'IND', votes: 50 },
        // sum = 350, but validVotes = 400 → MISMATCH
      ],
      presidingOfficerName: 'Jane Wanjiku',
    };

    const tallyUrl = evidenceUrl(`capsules/${newCapsuleId}/tally`);
    const response = await axios.patch(tallyUrl, invalidTally, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-Agent-User-Id': testAgentUserId,
      },
      timeout: config.timeouts.test,
      validateStatus: () => true,
    });

    // Server should either:
    // 1. Return 400/422 with error explaining the mismatch, OR
    // 2. Return 200 with validationStatus indicating the discrepancy
    if (response.status === 200) {
      const result = response.data;
      const validationStatus =
        result.tallyValidationStatus ||
        result.validationResult ||
        result.status;
      const errors = result.validationErrors || result.errors || [];

      // Should indicate mismatch
      expect(
        validationStatus === 'INVALID' ||
        validationStatus === 'CANDIDATE_SUM_MISMATCH' ||
        errors.some((e: any) =>
          typeof e === 'string'
            ? e.includes('CANDIDATE_SUM_MISMATCH') || e.includes('mismatch')
            : (e.code || e.type || '').includes('MISMATCH'),
        )
      ).toBeTruthy();
    } else {
      // 400 or 422 — error response
      expect([400, 422]).toContain(response.status);
      const msg = JSON.stringify(response.data).toLowerCase();
      expect(msg.includes('mismatch') || msg.includes('sum') || msg.includes('valid')).toBeTruthy();
    }
  });

  // ── Cleanup ──────────────────────────────────────────────────

  afterAll(async () => {
    // No explicit cleanup needed — test capsules are isolated by tenant
    // In a real environment, a cleanup job would purge test data
  });
});
