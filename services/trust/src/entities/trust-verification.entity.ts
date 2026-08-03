// ============================================================
// VoteCapsule — Trust Verification Log Entity (Hybrid Anchor)
// services/trust/src/entities/trust-verification.entity.ts
//
// Logs every verification request — who checked, when, and whether
// the Merkle proof validated against the dual-anchored batch.
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum RequesterType {
  SERVICE = 'SERVICE',    // Internal service-to-service call
  USER    = 'USER',       // Authenticated user
  PUBLIC  = 'PUBLIC',     // Public verification portal
  AUDIT   = 'AUDIT',     // Audit process / election observer
}

@Entity('trust_verifications')
@Index(['capsuleId'])
@Index(['sha256Hash'])
export class TrustVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({ name: 'sha256_hash', type: 'char', length: 64 })
  sha256Hash: string;

  @Column({ name: 'requester_type', type: 'varchar', length: 50, enum: RequesterType })
  requesterType: RequesterType;

  @Column({ name: 'requester_id', type: 'varchar', length: 255, nullable: true })
  requesterId: string | null;

  /** TRUE = Merkle proof recomputes to the anchored root */
  @Column({ name: 'hash_match', type: 'boolean' })
  hashMatch: boolean;

  /** TRUE = proof valid AND batch is DUAL_ANCHORED */
  @Column({ name: 'verified', type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'verified_at' })
  verifiedAt: Date;
}
