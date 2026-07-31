// ============================================================
// VoteCapsule — Trust Anchor Batch Entity
// services/trust/src/entities/trust-anchor-batch.entity.ts
//
// Each 60-second batch produces one record:
// - Merkle root computed from all leaves in the batch
// - Hedera Transaction ID (public blockchain anchor)
// - RFC 3161 CMS SignedData Token (legal timestamp anchor)
//
// This is the primary trust record — dual-anchored externally.
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, OneToMany,
} from 'typeorm';
import { TrustAnchorLeaf } from './trust-anchor-leaf.entity';

export enum BatchAnchorStatus {
  PENDING        = 'PENDING',          // Batch created, anchoring in progress
  HEDERA_ONLY    = 'HEDERA_ONLY',      // Hedera confirmed, TSA pending/failed
  TSA_ONLY       = 'TSA_ONLY',         // TSA confirmed, Hedera pending/failed
  DUAL_ANCHORED  = 'DUAL_ANCHORED',    // Both anchors confirmed
  FAILED         = 'FAILED',           // Both anchors failed
}

@Entity('trust_anchor_batches')
@Index(['merkleRoot'])
@Index(['hederaTransactionId'])
@Index(['status'])
@Index(['batchedAt'])
export class TrustAnchorBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Merkle Tree ──────────────────────────────────────────
  @Column({ name: 'merkle_root', type: 'char', length: 64 })
  merkleRoot: string;

  @Column({ name: 'leaf_count', type: 'int' })
  leafCount: number;

  @Column({ name: 'tree_depth', type: 'int' })
  treeDepth: number;

  // ── Hedera Consensus Service Anchor ──────────────────────
  @Column({ name: 'hedera_transaction_id', type: 'varchar', length: 255, nullable: true })
  hederaTransactionId: string | null;

  @Column({ name: 'hedera_consensus_timestamp', type: 'varchar', length: 100, nullable: true })
  hederaConsensusTimestamp: string | null;

  @Column({ name: 'hedera_topic_id', type: 'varchar', length: 50, nullable: true })
  hederaTopicId: string | null;

  @Column({ name: 'hedera_topic_sequence_number', type: 'bigint', nullable: true })
  hederaTopicSequenceNumber: number | null;

  @Column({ name: 'hedera_explorer_url', type: 'varchar', length: 500, nullable: true })
  hederaExplorerUrl: string | null;

  @Column({ name: 'hedera_network', type: 'varchar', length: 20, default: 'testnet' })
  hederaNetwork: string;

  // ── RFC 3161 Timestamp Authority Anchor ──────────────────
  @Column({ name: 'rfc3161_token', type: 'text', nullable: true })
  rfc3161Token: string | null;

  @Column({ name: 'rfc3161_tsa_url', type: 'varchar', length: 500, nullable: true })
  rfc3161TsaUrl: string | null;

  @Column({ name: 'rfc3161_signing_time', type: 'timestamptz', nullable: true })
  rfc3161SigningTime: Date | null;

  // ── Status & Metadata ────────────────────────────────────
  @Column({ name: 'status', type: 'varchar', length: 30, default: BatchAnchorStatus.PENDING })
  status: BatchAnchorStatus;

  @Column({ name: 'batched_at', type: 'timestamptz' })
  batchedAt: Date;

  @Column({ name: 'anchored_at', type: 'timestamptz', nullable: true })
  anchoredAt: Date | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ────────────────────────────────────────────
  @OneToMany(() => TrustAnchorLeaf, (leaf) => leaf.batch)
  leaves: TrustAnchorLeaf[];
}
