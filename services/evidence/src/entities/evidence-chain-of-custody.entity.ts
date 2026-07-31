import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index,
} from 'typeorm';
import { EvidenceCapsule } from './evidence-capsule.entity';

export enum CustodyEventType {
  CREATED              = 'CREATED',
  CAPTURED             = 'CAPTURED',
  SYNCED               = 'SYNCED',
  UPLOADED             = 'UPLOADED',
  HASH_VERIFIED        = 'HASH_VERIFIED',
  AI_SUBMITTED         = 'AI_SUBMITTED',
  AI_COMPLETED         = 'AI_COMPLETED',
  VALIDATION_ASSIGNED  = 'VALIDATION_ASSIGNED',
  VALIDATION_APPROVED  = 'VALIDATION_APPROVED',
  VALIDATION_REJECTED  = 'VALIDATION_REJECTED',
  VALIDATION_ESCALATED = 'VALIDATION_ESCALATED',
  TRUST_ANCHORED       = 'TRUST_ANCHORED',
  S3_LOCKED            = 'S3_LOCKED',
  PUBLISHED            = 'PUBLISHED',
  ARCHIVED             = 'ARCHIVED',
  RECOVERY_INITIATED   = 'RECOVERY_INITIATED',
  RECOVERY_COMPLETED   = 'RECOVERY_COMPLETED',
}

/**
 * Immutable event log for every evidence capsule.
 * NEVER update or delete records in this table.
 * Every state transition, every user action, every system event is recorded here.
 */
@Entity('evidence_chain_of_custody')
@Index(['capsuleId'])
@Index(['eventTimestamp'])
export class EvidenceChainOfCustody {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({
    name: 'event_type', length: 50,
    enum: CustodyEventType,
  })
  eventType: CustodyEventType;

  @Column({ name: 'previous_status', length: 30, nullable: true })
  previousStatus: string | null;

  @Column({ name: 'new_status', length: 30, nullable: true })
  newStatus: string | null;

  /** NULL for automated system events */
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  /** Service name for automated events e.g. "evidence-service", "ai-service" */
  @Column({ name: 'actor_service', length: 100, nullable: true })
  actorService: string | null;

  @Column({ name: 'actor_device_id', type: 'uuid', nullable: true })
  actorDeviceId: string | null;

  /**
   * Event-specific context data.
   * Examples:
   *   HASH_VERIFIED:  { "hash": "abc123...", "match": true }
   *   TRUST_ANCHORED: { "batchId": "...", "anchorStatus": "DUAL_ANCHORED" }
   *   AI_COMPLETED:   { "confidence": 0.94, "flagged": false }
   */
  @Column({ name: 'event_data', type: 'jsonb', nullable: true })
  eventData: Record<string, unknown> | null;

  @Column({ name: 'event_timestamp', type: 'timestamptz', default: () => 'NOW()' })
  eventTimestamp: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @ManyToOne(() => EvidenceCapsule, (c) => c.custodyEvents)
  @JoinColumn({ name: 'capsule_id' })
  capsule: EvidenceCapsule;
}
