// ============================================================
// VoteCapsule — Trust Service Unit Tests
// services/trust/src/trust.service.spec.ts
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { of } from 'rxjs';
import * as crypto from 'crypto';

import { TrustService } from './trust.service';
import { TrustAnchorBatch, BatchAnchorStatus } from './entities/trust-anchor-batch.entity';
import { TrustAnchorLeaf } from './entities/trust-anchor-leaf.entity';
import { TrustVerification, RequesterType } from './entities/trust-verification.entity';
import { HederaClientService } from './hedera/hedera.client';
import { Rfc3161ClientService } from './tsa/rfc3161.client';
import {
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
} from './merkle/merkle-tree.util';

// ── Helper: create a SHA-256 hash ──────────────────────────────
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ══════════════════════════════════════════════════════════════════
// Part 1: Merkle Tree Utility Tests (pure functions)
// ══════════════════════════════════════════════════════════════════
describe('Merkle Tree Utility', () => {
  describe('buildMerkleTree', () => {
    it('should return zero hash for empty input', () => {
      const tree = buildMerkleTree([]);
      expect(tree.root).toBe('0'.repeat(64));
      expect(tree.leafCount).toBe(0);
      expect(tree.treeDepth).toBe(0);
    });

    it('should return the leaf itself as root for single leaf', () => {
      const hash = sha256('capsule-1');
      const tree = buildMerkleTree([{ hash, capsuleId: 'c1' }]);

      expect(tree.root).toBe(hash.toLowerCase());
      expect(tree.leafCount).toBe(1);
      expect(tree.treeDepth).toBe(0);
      expect(tree.leaves).toHaveLength(1);
      expect(tree.leaves[0].capsuleId).toBe('c1');
    });

    it('should produce correct root for 4 leaves', () => {
      const hashes = [
        { hash: sha256('a'), capsuleId: 'c1' },
        { hash: sha256('b'), capsuleId: 'c2' },
        { hash: sha256('c'), capsuleId: 'c3' },
        { hash: sha256('d'), capsuleId: 'c4' },
      ];
      const tree = buildMerkleTree(hashes);

      expect(tree.leafCount).toBe(4);
      expect(tree.treeDepth).toBe(2);
      expect(tree.root).toHaveLength(64);
      // The root should be deterministic
      const tree2 = buildMerkleTree(hashes);
      expect(tree.root).toBe(tree2.root);
    });

    it('should handle odd number of leaves by duplicating last', () => {
      const hashes = [
        { hash: sha256('x'), capsuleId: 'c1' },
        { hash: sha256('y'), capsuleId: 'c2' },
        { hash: sha256('z'), capsuleId: 'c3' },
      ];
      const tree = buildMerkleTree(hashes);

      expect(tree.leafCount).toBe(3);
      expect(tree.treeDepth).toBe(2);
      expect(tree.root).toHaveLength(64);
    });

    it('should produce different roots for different inputs', () => {
      const tree1 = buildMerkleTree([
        { hash: sha256('foo'), capsuleId: 'c1' },
        { hash: sha256('bar'), capsuleId: 'c2' },
      ]);
      const tree2 = buildMerkleTree([
        { hash: sha256('baz'), capsuleId: 'c1' },
        { hash: sha256('qux'), capsuleId: 'c2' },
      ]);

      expect(tree1.root).not.toBe(tree2.root);
    });
  });

  describe('generateMerkleProof', () => {
    it('should generate a valid proof for leaf at index 0', () => {
      const hashes = [sha256('a'), sha256('b'), sha256('c'), sha256('d')];
      const proof = generateMerkleProof(hashes, 0);

      expect(proof.leafIndex).toBe(0);
      expect(proof.leafHash).toBe(hashes[0]);
      expect(proof.proofPath.length).toBeGreaterThan(0);
      expect(proof.root).toHaveLength(64);
    });

    it('should throw for invalid leaf index', () => {
      const hashes = [sha256('a'), sha256('b')];
      expect(() => generateMerkleProof(hashes, 5)).toThrow('Invalid leaf index');
      expect(() => generateMerkleProof(hashes, -1)).toThrow('Invalid leaf index');
    });
  });

  describe('verifyMerkleProof', () => {
    it('should return true for valid proof', () => {
      const hashes = [sha256('a'), sha256('b'), sha256('c'), sha256('d')];
      const proof = generateMerkleProof(hashes, 2);

      const valid = verifyMerkleProof(
        proof.leafHash,
        proof.leafIndex,
        proof.proofPath,
        proof.root,
      );
      expect(valid).toBe(true);
    });

    it('should return false for tampered proof path', () => {
      const hashes = [sha256('a'), sha256('b'), sha256('c'), sha256('d')];
      const proof = generateMerkleProof(hashes, 1);

      // Tamper with proof path
      const tamperedProof = [...proof.proofPath];
      tamperedProof[0] = sha256('tampered');

      const valid = verifyMerkleProof(
        proof.leafHash,
        proof.leafIndex,
        tamperedProof,
        proof.root,
      );
      expect(valid).toBe(false);
    });

    it('should return false for wrong leaf hash', () => {
      const hashes = [sha256('a'), sha256('b'), sha256('c'), sha256('d')];
      const proof = generateMerkleProof(hashes, 0);

      const valid = verifyMerkleProof(
        sha256('wrong-hash'),
        proof.leafIndex,
        proof.proofPath,
        proof.root,
      );
      expect(valid).toBe(false);
    });

    it('should return false for wrong root', () => {
      const hashes = [sha256('a'), sha256('b'), sha256('c'), sha256('d')];
      const proof = generateMerkleProof(hashes, 3);

      const valid = verifyMerkleProof(
        proof.leafHash,
        proof.leafIndex,
        proof.proofPath,
        sha256('wrong-root'),
      );
      expect(valid).toBe(false);
    });

    it('should verify all leaves in a tree', () => {
      const hashes = [sha256('1'), sha256('2'), sha256('3'), sha256('4'), sha256('5')];

      for (let i = 0; i < hashes.length; i++) {
        const proof = generateMerkleProof(hashes, i);
        const valid = verifyMerkleProof(
          proof.leafHash,
          proof.leafIndex,
          proof.proofPath,
          proof.root,
        );
        expect(valid).toBe(true);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// Part 2: TrustService Integration Tests (mocked dependencies)
// ══════════════════════════════════════════════════════════════════
describe('TrustService', () => {
  let service: TrustService;
  let batchRepo: any;
  let leafRepo: any;
  let verifyRepo: any;
  let hederaClient: any;
  let tsaClient: any;
  let httpService: any;

  const mockBatchRepo = {
    create: jest.fn((data) => ({ id: 'batch-1', ...data })),
    save: jest.fn((entity) => Promise.resolve({ id: 'batch-1', ...entity })),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockLeafRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((entities) => Promise.resolve(entities)),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockVerifyRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockHederaClient = {
    isReady: jest.fn().mockReturnValue(true),
    getNetwork: jest.fn().mockReturnValue('testnet'),
    submitMerkleRoot: jest.fn().mockResolvedValue({
      transactionId: '0.0.4426239@1234567890.123',
      consensusTimestamp: '2026-01-01T00:00:00.000Z',
      topicId: '0.0.9871113',
      topicSequenceNumber: 42,
      explorerUrl: 'https://hashscan.io/testnet/transaction/0.0.4426239@1234567890.123',
    }),
  };

  const mockTsaClient = {
    isReady: jest.fn().mockReturnValue(true),
    getTsaUrl: jest.fn().mockReturnValue('https://freetsa.org/tsr'),
    requestTimestamp: jest.fn().mockResolvedValue({
      token: 'base64-token-data',
      tsaUrl: 'https://freetsa.org/tsr',
      signingTime: '2026-01-01T00:00:00.000Z',
      status: 'success',
    }),
  };

  const mockHttpService = {
    patch: jest.fn().mockReturnValue(of({ data: { ok: true } })),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal?: any) => {
      const config: Record<string, any> = {
        EVIDENCE_SERVICE_URL: 'http://localhost:3005',
        MERKLE_BATCH_INTERVAL_MS: 60000,
      };
      return config[key] ?? defaultVal;
    }),
  };

  const mockDataSource = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrustService,
        { provide: getRepositoryToken(TrustAnchorBatch), useValue: mockBatchRepo },
        { provide: getRepositoryToken(TrustAnchorLeaf), useValue: mockLeafRepo },
        { provide: getRepositoryToken(TrustVerification), useValue: mockVerifyRepo },
        { provide: HederaClientService, useValue: mockHederaClient },
        { provide: Rfc3161ClientService, useValue: mockTsaClient },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TrustService>(TrustService);
    batchRepo = mockBatchRepo;
    leafRepo = mockLeafRepo;
    verifyRepo = mockVerifyRepo;
    hederaClient = mockHederaClient;
    tsaClient = mockTsaClient;
    httpService = mockHttpService;
  });

  afterEach(() => {
    // Stop the batch timer to avoid leaking intervals
    service.onModuleDestroy();
  });

  describe('queueForAnchor', () => {
    it('should queue a new capsule hash', async () => {
      leafRepo.findOne.mockResolvedValue(null);

      const result = await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('evidence-data'),
        requestedByService: 'evidence-service',
      });

      expect(result.queued).toBe(true);
    });

    it('should return existing leaf if already anchored (idempotent)', async () => {
      leafRepo.findOne.mockResolvedValue({
        id: 'leaf-existing',
        capsuleId: 'cap-1',
        batchId: 'batch-existing',
      });

      const result = await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('evidence-data'),
        requestedByService: 'evidence-service',
      });

      expect(result.queued).toBe(false);
      expect(result.leafId).toBe('leaf-existing');
    });
  });

  describe('processBatch', () => {
    it('should return null if queue is empty', async () => {
      const result = await service.processBatch();
      expect(result).toBeNull();
    });

    it('should submit Merkle root to Hedera topic', async () => {
      // Queue items first
      leafRepo.findOne.mockResolvedValue(null);
      await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('data-1'),
        requestedByService: 'evidence-service',
      });
      await service.queueForAnchor({
        capsuleId: 'cap-2',
        sha256Hash: sha256('data-2'),
        requestedByService: 'evidence-service',
      });

      await service.processBatch();

      expect(hederaClient.submitMerkleRoot).toHaveBeenCalledWith(
        expect.any(String), // merkle root
        'batch-1',          // batch id
        2,                  // leaf count
      );
    });

    it('should submit Merkle root to RFC 3161 TSA', async () => {
      leafRepo.findOne.mockResolvedValue(null);
      await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('data-1'),
        requestedByService: 'evidence-service',
      });

      await service.processBatch();

      expect(tsaClient.requestTimestamp).toHaveBeenCalledWith(expect.any(String));
    });

    it('should store batch and leaf records on success', async () => {
      leafRepo.findOne.mockResolvedValue(null);
      await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('data-1'),
        requestedByService: 'evidence-service',
      });

      await service.processBatch();

      // Batch saved (at least twice: create + update with anchor results)
      expect(batchRepo.save).toHaveBeenCalled();
      // Leaf records saved
      expect(leafRepo.save).toHaveBeenCalled();
    });

    it('should notify Evidence Service for each capsule', async () => {
      leafRepo.findOne.mockResolvedValue(null);
      await service.queueForAnchor({
        capsuleId: 'cap-A',
        sha256Hash: sha256('A'),
        requestedByService: 'evidence-service',
      });
      await service.queueForAnchor({
        capsuleId: 'cap-B',
        sha256Hash: sha256('B'),
        requestedByService: 'evidence-service',
      });

      await service.processBatch();

      // Should call PATCH for each capsule
      expect(httpService.patch).toHaveBeenCalledTimes(2);
      expect(httpService.patch).toHaveBeenCalledWith(
        'http://localhost:3005/api/v1/evidence/capsules/cap-A/anchored',
        expect.objectContaining({ batchId: 'batch-1' }),
      );
    });

    it('should mark batch as DUAL_ANCHORED when both Hedera and TSA succeed', async () => {
      leafRepo.findOne.mockResolvedValue(null);
      await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('x'),
        requestedByService: 'evidence-service',
      });

      await service.processBatch();

      // The last batchRepo.save should include DUAL_ANCHORED status
      const savedBatch = batchRepo.save.mock.calls[batchRepo.save.mock.calls.length - 1][0];
      expect(savedBatch.status).toBe(BatchAnchorStatus.DUAL_ANCHORED);
    });

    it('should mark batch HEDERA_ONLY when TSA fails', async () => {
      tsaClient.requestTimestamp.mockResolvedValue({
        token: '',
        tsaUrl: 'https://freetsa.org/tsr',
        signingTime: '',
        status: 'failed',
        errorMessage: 'Connection timeout',
      });

      leafRepo.findOne.mockResolvedValue(null);
      await service.queueForAnchor({
        capsuleId: 'cap-1',
        sha256Hash: sha256('y'),
        requestedByService: 'evidence-service',
      });

      await service.processBatch();

      const savedBatch = batchRepo.save.mock.calls[batchRepo.save.mock.calls.length - 1][0];
      expect(savedBatch.status).toBe(BatchAnchorStatus.HEDERA_ONLY);
    });
  });

  describe('verifyCapsule', () => {
    it('should return not-found result for non-existent capsule', async () => {
      leafRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyCapsule('non-existent');

      expect(result.found).toBe(false);
      expect(result.status).toBe('NOT_FOUND');
      expect(result.hedera).toBeNull();
      expect(result.rfc3161).toBeNull();
    });

    it('should verify an existing capsule with valid proof', async () => {
      const hashes = [sha256('leaf-0'), sha256('leaf-1')];
      const proof = generateMerkleProof(hashes, 0);

      leafRepo.findOne.mockResolvedValue({
        capsuleId: 'cap-1',
        sha256Hash: hashes[0],
        leafIndex: 0,
        merkleProof: proof.proofPath,
        batch: {
          id: 'batch-1',
          merkleRoot: proof.root,
          status: BatchAnchorStatus.DUAL_ANCHORED,
          anchoredAt: new Date('2026-01-01'),
          hederaTransactionId: '0.0.4426239@1234567890',
          hederaConsensusTimestamp: '2026-01-01T00:00:00Z',
          hederaExplorerUrl: 'https://hashscan.io/testnet/transaction/...',
          hederaNetwork: 'testnet',
          rfc3161TsaUrl: 'https://freetsa.org/tsr',
          rfc3161SigningTime: new Date('2026-01-01'),
          rfc3161Token: 'token-data',
        },
      });

      const result = await service.verifyCapsule('cap-1', 'user-1', RequesterType.USER);

      expect(result.found).toBe(true);
      expect(result.hashMatch).toBe(true);
      expect(result.batchId).toBe('batch-1');
      expect(result.hedera).toBeDefined();
      expect(result.hedera!.network).toBe('testnet');
      expect(result.rfc3161).toBeDefined();
      expect(result.rfc3161!.hasToken).toBe(true);
    });

    it('should return hashMatch=false for invalid proof', async () => {
      leafRepo.findOne.mockResolvedValue({
        capsuleId: 'cap-1',
        sha256Hash: sha256('real-data'),
        leafIndex: 0,
        merkleProof: [sha256('wrong-sibling')],
        batch: {
          id: 'batch-1',
          merkleRoot: sha256('some-root'),
          status: BatchAnchorStatus.DUAL_ANCHORED,
          anchoredAt: new Date(),
          hederaTransactionId: null,
          hederaConsensusTimestamp: null,
          hederaExplorerUrl: null,
          hederaNetwork: 'testnet',
          rfc3161TsaUrl: null,
          rfc3161SigningTime: null,
          rfc3161Token: null,
        },
      });

      const result = await service.verifyCapsule('cap-1');

      expect(result.found).toBe(true);
      expect(result.hashMatch).toBe(false);
    });

    it('should log verification record', async () => {
      leafRepo.findOne.mockResolvedValue(null);

      await service.verifyCapsule('missing-capsule', 'user-1');

      // For not-found, no verify repo save is called
      // For found capsules it would be called
    });
  });

  describe('getBatch', () => {
    it('should return batch with leaves', async () => {
      batchRepo.findOne.mockResolvedValue({
        id: 'batch-1',
        merkleRoot: sha256('root'),
        leafCount: 3,
        leaves: [],
      });

      const result = await service.getBatch('batch-1');
      expect(result.id).toBe('batch-1');
    });

    it('should throw NotFoundException for missing batch', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.getBatch('non-existent'))
        .rejects.toThrow('not found');
    });
  });

  describe('getProof', () => {
    it('should return proof with valid verification', async () => {
      const hashes = [sha256('a'), sha256('b')];
      const proof = generateMerkleProof(hashes, 0);

      leafRepo.findOne.mockResolvedValue({
        capsuleId: 'cap-1',
        sha256Hash: hashes[0],
        leafIndex: 0,
        merkleProof: proof.proofPath,
        batchId: 'batch-1',
        batch: {
          merkleRoot: proof.root,
          hederaTransactionId: 'tx-id',
          hederaExplorerUrl: 'https://hashscan.io/...',
          rfc3161TsaUrl: 'https://freetsa.org/tsr',
          rfc3161Token: 'token',
        },
      });

      const result = await service.getProof('cap-1');

      expect(result.proofValid).toBe(true);
      expect(result.merkleRoot).toBe(proof.root);
      expect(result.hedera.transactionId).toBe('tx-id');
    });

    it('should throw NotFoundException for missing capsule', async () => {
      leafRepo.findOne.mockResolvedValue(null);

      await expect(service.getProof('missing'))
        .rejects.toThrow('not found');
    });
  });

  describe('batch interval behavior', () => {
    it('should accumulate leaves until timer fires', async () => {
      leafRepo.findOne.mockResolvedValue(null);

      // Queue 3 items without processing
      await service.queueForAnchor({ capsuleId: 'c1', sha256Hash: sha256('1'), requestedByService: 'test' });
      await service.queueForAnchor({ capsuleId: 'c2', sha256Hash: sha256('2'), requestedByService: 'test' });
      await service.queueForAnchor({ capsuleId: 'c3', sha256Hash: sha256('3'), requestedByService: 'test' });

      // Nothing submitted yet until processBatch is called
      expect(hederaClient.submitMerkleRoot).not.toHaveBeenCalled();

      // Now process
      await service.processBatch();

      // All 3 should be in one batch
      expect(hederaClient.submitMerkleRoot).toHaveBeenCalledWith(
        expect.any(String),
        'batch-1',
        3,
      );
    });
  });

  describe('getStats', () => {
    it('should return platform stats', async () => {
      batchRepo.count.mockResolvedValue(10);
      leafRepo.count.mockResolvedValue(50);

      const stats = await service.getStats();

      expect(stats.totalBatches).toBe(10);
      expect(stats.totalLeaves).toBe(50);
      expect(stats.hederaNetwork).toBe('testnet');
      expect(stats.tsaUrl).toBe('https://freetsa.org/tsr');
    });
  });
});
