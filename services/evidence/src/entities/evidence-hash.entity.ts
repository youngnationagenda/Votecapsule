import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { EvidenceCapsule } from './evidence-capsule.entity';

/**
 * Stores the composite hash anchored via the Hybrid Anchor (Hedera + RFC 3161).
 * Formula: SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
 * Computed on device at capture time — works offline.
 * Server re-derives and compares before anchoring.
 */
@Entity('evidence_hashes')
export class EvidenceHash {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({ name: 'image_id', type: 'uuid', nullable: true })
  imageId: string | null;

  @Column({ name: 'hash_type', type: 'varchar', length: 30, default: 'CAPSULE_COMPOSITE' })
  hashType: string;

  @Column({ name: 'algorithm', type: 'varchar', length: 10, default: 'SHA-256' })
  algorithm: string;

  /** The actual hash value — 64 hex chars for SHA-256 */
  @Column({ name: 'hash_value', type: 'char', length: 64 })
  hashValue: string;

  /**
   * The components that were hashed, stored for independent verification.
   * Example: { "image_s3_key": "...", "metadata_json": "...", "capture_timestamp": "..." }
   */
  @Column({ name: 'hashed_components', type: 'jsonb' })
  hashedComponents: Record<string, unknown>;

  @Column({ name: 'computed_on_device', type: 'boolean', default: true })
  computedOnDevice: boolean;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @Column({ name: 'server_verified', type: 'boolean', default: false })
  serverVerified: boolean;

  @Column({ name: 'server_verified_at', type: 'timestamptz', nullable: true })
  serverVerifiedAt: Date | null;

  /** NULL = not yet verified. TRUE = match. FALSE = tampered. */
  @Column({ name: 'verification_match', type: 'boolean', nullable: true })
  verificationMatch: boolean | null;

  /** Filled by Trust Service after Merkle batch is dual-anchored */
  @Column({ name: 'trust_anchor_batch_id', type: 'uuid', nullable: true })
  trustAnchorBatchId: string | null;

  @Column({ name: 'anchored_at', type: 'timestamptz', nullable: true })
  anchoredAt: Date | null;

  @Column({ name: 'anchor_status', type: 'varchar', length: 30, nullable: true })
  anchorStatus: string | null;   // PENDING | HEDERA_ONLY | TSA_ONLY | DUAL_ANCHORED | FAILED

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EvidenceCapsule, (c) => c.hashes)
  @JoinColumn({ name: 'capsule_id' })
  capsule: EvidenceCapsule;
}
