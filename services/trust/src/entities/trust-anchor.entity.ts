// ============================================================
// VoteCapsule — Trust Anchor Entity
// services/trust/src/entities/trust-anchor.entity.ts
//
// Operational index of every QLDB anchoring operation.
// The QLDB journal is the authoritative record.
// This table enables fast lookup without a full QLDB scan.
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum AnchorStatus {
  ANCHORED = 'ANCHORED',
  VERIFIED = 'VERIFIED',
  FAILED   = 'FAILED',
  REVOKED  = 'REVOKED',       // Rare — evidence later found fraudulent by court order
}

@Entity('trust_anchors')
@Index(['capsuleId', 'sha256Hash'], { unique: true })
@Index(['sha256Hash'])
@Index(['qldbDocumentId'])
export class TrustAnchor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Evidence reference (cross-service — no FK constraint across service boundaries)
  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({ name: 'sha256_hash', type: 'char', length: 64 })
  sha256Hash: string;

  // QLDB record
  @Column({ name: 'qldb_ledger_name', length: 100, default: 'vote-capsule-trust' })
  qldbLedgerName: string;

  @Column({ name: 'qldb_document_id', length: 255 })
  qldbDocumentId: string;

  @Column({ name: 'qldb_table_name', length: 100, default: 'TrustAnchors' })
  qldbTableName: string;

  @Column({ name: 'qldb_sequence_no', length: 100 })
  qldbSequenceNo: string;

  @Column({ name: 'qldb_anchored_at', type: 'timestamptz' })
  qldbAnchoredAt: Date;

  /** Base64-encoded QLDB ledger digest captured at anchor time */
  @Column({ name: 'qldb_digest', type: 'text', nullable: true })
  qldbDigest: string | null;

  @Column({ name: 'status', length: 30, default: AnchorStatus.ANCHORED, enum: AnchorStatus })
  status: AnchorStatus;

  @Column({ name: 'requested_by_service', length: 100 })
  requestedByService: string;

  @Column({ name: 'requested_by_user', type: 'uuid', nullable: true })
  requestedByUser: string | null;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, unknown> | null;

  @Column({ name: 'last_verified_at', type: 'timestamptz', nullable: true })
  lastVerifiedAt: Date | null;

  @Column({ name: 'verification_count', default: 0 })
  verificationCount: number;

  @Column({ name: 'last_verify_result', nullable: true })
  lastVerifyResult: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
