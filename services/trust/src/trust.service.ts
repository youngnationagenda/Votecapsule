// ============================================================
// VoteCapsule — Trust Service Business Logic (Hybrid Anchor)
// services/trust/src/trust.service.ts
//
// Manages the complete Hybrid Anchor lifecycle:
//   1. Queue evidence hashes as they are approved
//   2. Every 60 seconds, build a Merkle tree from queued hashes
//   3. Submit Merkle root to Hedera Consensus Service (Testnet)
//   4. Submit Merkle root to RFC 3161 TSA (FreeTSA.org)
//   5. Store batch record + leaf records in PostgreSQL
//   6. Call back Evidence Service to confirm anchoring
//
// No QLDB. No smart contracts. No Ethereum. No Hyperledger.
// ============================================================
import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TrustAnchorBatch, BatchAnchorStatus } from './entities/trust-anchor-batch.entity';
import { TrustAnchorLeaf } from './entities/trust-anchor-leaf.entity';
import { TrustVerification, RequesterType } from './entities/trust-verification.entity';
import { HederaClientService } from './hedera/hedera.client';
import { Rfc3161ClientService } from './tsa/rfc3161.client';
import {
  buildMerkleTree, generateMerkleProof, verifyMerkleProof,
} from './merkle/merkle-tree.util';
import type { AnchorRequestDto } from './dto/anchor-request.dto';

export interface VerificationResult {
  capsuleId:   string;
  sha256Hash:  string;
  found:       boolean;
  hashMatch:   boolean;
  anchoredAt:  string | null;
  batchId:     string | null;
  merkleRoot:  string | null;
  merkleProof: string[] | null;
  hedera: {
    transactionId: string | null;
    consensusTimestamp: string | null;
    explorerUrl: string | null;
    network: string;
  } | null;
  rfc3161: {
    tsaUrl: string | null;
    signingTime: string | null;
    hasToken: boolean;
  } | null;
  status:      string;
  verifiedAt:  string;
}

interface QueuedHash {
  capsuleId: string;
  sha256Hash: string;
  requestedByService: string;
  requestedByUser: string | null;
}

@Injectable()
export class TrustService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrustService.name);
  private readonly evidenceServiceUrl: string;
  private readonly batchIntervalMs: number;
  private hashQueue: QueuedHash[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(TrustAnchorBatch)
    private readonly batchRepo: Repository<TrustAnchorBatch>,

    @InjectRepository(TrustAnchorLeaf)
    private readonly leafRepo: Repository<TrustAnchorLeaf>,

    @InjectRepository(TrustVerification)
    private readonly verifyRepo: Repository<TrustVerification>,

    private readonly hedera: HederaClientService,
    private readonly tsa: Rfc3161ClientService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.evidenceServiceUrl = config.get(
      'EVIDENCE_SERVICE_URL',
      'http://localhost:3005',
    );
    this.batchIntervalMs = config.get('MERKLE_BATCH_INTERVAL_MS', 60000);
  }

  // ── Lifecycle ─────────────────────────────────────────────

  onModuleInit() {
    this.startBatchProcessor();
    this.logger.log(
      `Trust Service started — batch interval: ${this.batchIntervalMs}ms, ` +
      `Hedera: ${this.hedera.getNetwork()}, TSA: ${this.tsa.getTsaUrl()}`
    );
  }

  onModuleDestroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // ── Queue hash for anchoring ──────────────────────────────

  /**
   * Queue an evidence hash for the next Merkle batch.
   * Called when a validator APPROVES an Evidence Capsule.
   *
   * Idempotent — if already anchored, returns existing leaf.
   */
  async queueForAnchor(dto: AnchorRequestDto): Promise<{ queued: boolean; leafId?: string }> {
    // Idempotency check
    const existing = await this.leafRepo.findOne({
      where: { capsuleId: dto.capsuleId },
    });
    if (existing) {
      this.logger.warn(`Capsule ${dto.capsuleId} already anchored in batch ${existing.batchId}`);
      return { queued: false, leafId: existing.id };
    }

    // Add to queue
    this.hashQueue.push({
      capsuleId: dto.capsuleId,
      sha256Hash: dto.sha256Hash,
      requestedByService: dto.requestedByService ?? 'evidence-service',
      requestedByUser: dto.validatorUserId ?? null,
    });

    this.logger.log(`Queued capsule ${dto.capsuleId} for next Merkle batch (queue size: ${this.hashQueue.length})`);
    return { queued: true };
  }

  // ── Batch Processor (runs every 60 seconds) ───────────────

  private startBatchProcessor() {
    this.batchTimer = setInterval(async () => {
      if (this.hashQueue.length === 0) return;
      await this.processBatch();
    }, this.batchIntervalMs);
  }

  /**
   * Process the current queue:
   * 1. Build Merkle tree
   * 2. Submit root to Hedera + RFC 3161
   * 3. Store batch + leaf records
   * 4. Notify Evidence Service
   */
  async processBatch(): Promise<TrustAnchorBatch | null> {
    // Drain queue atomically
    const items = [...this.hashQueue];
    this.hashQueue = [];

    if (items.length === 0) return null;

    this.logger.log(`Processing Merkle batch — ${items.length} leaves`);

    // Build Merkle tree
    const hashes = items.map((i) => ({ hash: i.sha256Hash, capsuleId: i.capsuleId }));
    const tree = buildMerkleTree(hashes);

    // Create batch record (PENDING)
    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        merkleRoot: tree.root,
        leafCount: tree.leafCount,
        treeDepth: tree.treeDepth,
        status: BatchAnchorStatus.PENDING,
        batchedAt: new Date(),
        hederaNetwork: this.hedera.getNetwork(),
      }),
    );

    // Dual-anchor: Hedera + RFC 3161 (concurrent)
    const [hederaResult, tsaResult] = await Promise.allSettled([
      this.hedera.isReady()
        ? this.hedera.submitMerkleRoot(tree.root, batch.id, tree.leafCount)
        : Promise.reject(new Error('Hedera not configured')),
      this.tsa.isReady()
        ? this.tsa.requestTimestamp(tree.root)
        : Promise.reject(new Error('TSA not configured')),
    ]);

    // Update batch with anchor results
    let status = BatchAnchorStatus.FAILED;
    const errors: string[] = [];

    if (hederaResult.status === 'fulfilled') {
      batch.hederaTransactionId = hederaResult.value.transactionId;
      batch.hederaConsensusTimestamp = hederaResult.value.consensusTimestamp;
      batch.hederaTopicId = hederaResult.value.topicId;
      batch.hederaTopicSequenceNumber = hederaResult.value.topicSequenceNumber;
      batch.hederaExplorerUrl = hederaResult.value.explorerUrl;
      status = BatchAnchorStatus.HEDERA_ONLY;
    } else {
      errors.push(`Hedera: ${hederaResult.reason}`);
    }

    if (tsaResult.status === 'fulfilled' && tsaResult.value.status === 'success') {
      batch.rfc3161Token = tsaResult.value.token;
      batch.rfc3161TsaUrl = tsaResult.value.tsaUrl;
      batch.rfc3161SigningTime = new Date(tsaResult.value.signingTime);
      status = status === BatchAnchorStatus.HEDERA_ONLY
        ? BatchAnchorStatus.DUAL_ANCHORED
        : BatchAnchorStatus.TSA_ONLY;
    } else {
      const reason = tsaResult.status === 'rejected'
        ? tsaResult.reason
        : tsaResult.value.errorMessage;
      errors.push(`TSA: ${reason}`);
    }

    batch.status = status;
    batch.anchoredAt = new Date();
    batch.errorMessage = errors.length > 0 ? errors.join('; ') : null;
    await this.batchRepo.save(batch);

    // Store leaf records with Merkle proofs
    const allHashes = items.map((i) => i.sha256Hash);
    const leafRecords = items.map((item, index) => {
      const proof = generateMerkleProof(allHashes, index);
      return this.leafRepo.create({
        capsuleId: item.capsuleId,
        sha256Hash: item.sha256Hash,
        batchId: batch.id,
        leafIndex: index,
        merkleProof: proof.proofPath,
        anchoredAt: batch.anchoredAt ?? new Date(),
        requestedByService: item.requestedByService,
        requestedByUser: item.requestedByUser,
      });
    });
    await this.leafRepo.save(leafRecords);

    // Notify Evidence Service for each capsule
    for (const item of items) {
      await this.notifyEvidenceService(item.capsuleId, batch.id, batch.status);
    }

    this.logger.log(
      `Batch ${batch.id} complete — status: ${status}, leaves: ${tree.leafCount}, ` +
      `root: ${tree.root.substring(0, 16)}...`
    );

    return batch;
  }

  // ── Verify by capsule ID ──────────────────────────────────

  async verifyCapsule(
    capsuleId: string,
    requesterId?: string,
    requesterType: RequesterType = RequesterType.USER,
  ): Promise<VerificationResult> {
    const startMs = Date.now();

    // Find leaf record
    const leaf = await this.leafRepo.findOne({
      where: { capsuleId },
      relations: ['batch'],
    });

    if (!leaf) {
      return this.notFoundResult(capsuleId);
    }

    const batch = leaf.batch;

    // Verify Merkle proof
    const proofValid = verifyMerkleProof(
      leaf.sha256Hash,
      leaf.leafIndex,
      leaf.merkleProof,
      batch.merkleRoot,
    );

    const durationMs = Date.now() - startMs;

    // Log verification
    await this.verifyRepo.save(
      this.verifyRepo.create({
        capsuleId,
        sha256Hash: leaf.sha256Hash,
        requesterType,
        requesterId: requesterId ?? null,
        hashMatch: proofValid,
        verified: proofValid && batch.status === BatchAnchorStatus.DUAL_ANCHORED,
        durationMs,
      }),
    );

    return {
      capsuleId,
      sha256Hash: leaf.sha256Hash,
      found: true,
      hashMatch: proofValid,
      anchoredAt: batch.anchoredAt?.toISOString() ?? null,
      batchId: batch.id,
      merkleRoot: batch.merkleRoot,
      merkleProof: leaf.merkleProof,
      hedera: {
        transactionId: batch.hederaTransactionId,
        consensusTimestamp: batch.hederaConsensusTimestamp,
        explorerUrl: batch.hederaExplorerUrl,
        network: batch.hederaNetwork,
      },
      rfc3161: {
        tsaUrl: batch.rfc3161TsaUrl,
        signingTime: batch.rfc3161SigningTime?.toISOString() ?? null,
        hasToken: !!batch.rfc3161Token,
      },
      status: batch.status,
      verifiedAt: new Date().toISOString(),
    };
  }

  // ── Verify by hash ────────────────────────────────────────

  async verifyByHash(
    sha256Hash: string,
    requesterId?: string,
  ): Promise<VerificationResult> {
    const leaf = await this.leafRepo.findOne({
      where: { sha256Hash: sha256Hash.toLowerCase() },
      relations: ['batch'],
    });

    if (!leaf) {
      return this.notFoundResult('', sha256Hash);
    }

    return this.verifyCapsule(leaf.capsuleId, requesterId);
  }

  // ── Get batch details ─────────────────────────────────────

  async getBatch(batchId: string): Promise<TrustAnchorBatch> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['leaves'],
    });
    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);
    return batch;
  }

  // ── Get proof for a capsule ───────────────────────────────

  async getProof(capsuleId: string): Promise<{
    capsuleId: string;
    leafHash: string;
    leafIndex: number;
    merkleProof: string[];
    merkleRoot: string;
    batchId: string;
    hedera: { transactionId: string | null; explorerUrl: string | null };
    rfc3161: { tsaUrl: string | null; hasToken: boolean };
    proofValid: boolean;
  }> {
    const leaf = await this.leafRepo.findOne({
      where: { capsuleId },
      relations: ['batch'],
    });
    if (!leaf) throw new NotFoundException(`No anchor found for capsule ${capsuleId}`);

    const proofValid = verifyMerkleProof(
      leaf.sha256Hash,
      leaf.leafIndex,
      leaf.merkleProof,
      leaf.batch.merkleRoot,
    );

    return {
      capsuleId,
      leafHash: leaf.sha256Hash,
      leafIndex: leaf.leafIndex,
      merkleProof: leaf.merkleProof,
      merkleRoot: leaf.batch.merkleRoot,
      batchId: leaf.batchId,
      hedera: {
        transactionId: leaf.batch.hederaTransactionId,
        explorerUrl: leaf.batch.hederaExplorerUrl,
      },
      rfc3161: {
        tsaUrl: leaf.batch.rfc3161TsaUrl,
        hasToken: !!leaf.batch.rfc3161Token,
      },
      proofValid,
    };
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats(): Promise<{
    totalBatches: number;
    totalLeaves: number;
    dualAnchored: number;
    partialAnchored: number;
    pendingQueue: number;
    hederaNetwork: string;
    tsaUrl: string;
  }> {
    const [totalBatches, totalLeaves, dualAnchored, partialAnchored] = await Promise.all([
      this.batchRepo.count(),
      this.leafRepo.count(),
      this.batchRepo.count({ where: { status: BatchAnchorStatus.DUAL_ANCHORED } }),
      this.batchRepo.count({ where: [
        { status: BatchAnchorStatus.HEDERA_ONLY },
        { status: BatchAnchorStatus.TSA_ONLY },
      ] }),
    ]);

    return {
      totalBatches,
      totalLeaves,
      dualAnchored,
      partialAnchored,
      pendingQueue: this.hashQueue.length,
      hederaNetwork: this.hedera.getNetwork(),
      tsaUrl: this.tsa.getTsaUrl(),
    };
  }

  // ── Private helpers ───────────────────────────────────────

  private notFoundResult(capsuleId: string, sha256Hash = ''): VerificationResult {
    return {
      capsuleId,
      sha256Hash,
      found: false,
      hashMatch: false,
      anchoredAt: null,
      batchId: null,
      merkleRoot: null,
      merkleProof: null,
      hedera: null,
      rfc3161: null,
      status: 'NOT_FOUND',
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Notify Evidence Service that a capsule has been anchored.
   * Evidence Service updates capsule status to ANCHORED.
   */
  private async notifyEvidenceService(
    capsuleId: string,
    batchId: string,
    status: BatchAnchorStatus,
  ): Promise<void> {
    try {
      const url = `${this.evidenceServiceUrl}/api/v1/evidence/capsules/${capsuleId}/anchored`;
      await firstValueFrom(
        this.httpService.patch(url, { batchId, anchorStatus: status }),
      );
    } catch (e) {
      // Non-fatal: Evidence Service can be updated manually if this fails.
      // The anchor record exists — that is the source of truth.
      this.logger.error(
        `Failed to notify Evidence Service for capsule ${capsuleId}: ${e}. ` +
        'Anchor is complete — callback can be retried.',
      );
    }
  }
}
