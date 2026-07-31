// ============================================================
// VoteCapsule — Trust Anchor Leaf Entity
// services/trust/src/entities/trust-anchor-leaf.entity.ts
//
// Links individual Evidence Capsule hashes to their Merkle batch.
// Stores the proof path so any capsule can be independently verified.
//
// Verification: leaf hash + proof path → recomputes to batch's Merkle root
//               → Merkle root confirmed on Hedera + RFC 3161
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { TrustAnchorBatch } from './trust-anchor-batch.entity';

@Entity('trust_anchor_leaves')
@Index(['capsuleId'], { unique: true })
@Index(['sha256Hash'])
@Index(['batchId'])
export class TrustAnchorLeaf {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Evidence Reference ───────────────────────────────────
  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({ name: 'sha256_hash', type: 'char', length: 64 })
  sha256Hash: string;

  // ── Batch Reference ──────────────────────────────────────
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @ManyToOne(() => TrustAnchorBatch, (batch) => batch.leaves)
  @JoinColumn({ name: 'batch_id' })
  batch: TrustAnchorBatch;

  // ── Merkle Proof ─────────────────────────────────────────
  @Column({ name: 'leaf_index', type: 'int' })
  leafIndex: number;

  /** JSON array of sibling hashes from leaf to root */
  @Column({ name: 'merkle_proof', type: 'jsonb' })
  merkleProof: string[];

  // ── Metadata ─────────────────────────────────────────────
  @Column({ name: 'anchored_at', type: 'timestamptz' })
  anchoredAt: Date;

  @Column({ name: 'requested_by_service', type: 'varchar', length: 100, default: 'evidence-service' })
  requestedByService: string;

  @Column({ name: 'requested_by_user', type: 'uuid', nullable: true })
  requestedByUser: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
