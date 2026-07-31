import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { EvidenceCapsule } from './evidence-capsule.entity';

/**
 * Stores the composite hash anchored to QLDB.
 * Formula: SHA-256(image_bytes + metadata_json + capture_timestamp)
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

  @Column({ name: 'hash_type', length: 30, default: 'CAPSULE_COMPOSITE' })
  hashType: string;

  @Column({ name: 'algorithm', length: 10, default: 'SHA-256' })
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

  @Column({ name: 'computed_on_device', default: true })
  computedOnDevice: boolean;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @Column({ name: 'server_verified', default: false })
  serverVerified: boolean;

  @Column({ name: 'server_verified_at', type: 'timestamptz', nullable: true })
  serverVerifiedAt: Date | null;

  /** NULL = not yet verified. TRUE = match. FALSE = tampered. */
  @Column({ name: 'verification_match', nullable: true })
  verificationMatch: boolean | null;

  /** Filled by Trust Service after QLDB anchoring */
  @Column({ name: 'qldb_document_id', length: 255, nullable: true })
  qldbDocumentId: string | null;

  @Column({ name: 'qldb_anchored_at', type: 'timestamptz', nullable: true })
  qldbAnchoredAt: Date | null;

  @Column({ name: 'qldb_sequence_no', length: 100, nullable: true })
  qldbSequenceNo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EvidenceCapsule, (c) => c.hashes)
  @JoinColumn({ name: 'capsule_id' })
  capsule: EvidenceCapsule;
}
