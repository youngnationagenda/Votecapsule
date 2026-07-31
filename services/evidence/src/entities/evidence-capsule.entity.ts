import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { EvidenceImage }          from './evidence-image.entity';
import { EvidenceHash }           from './evidence-hash.entity';
import { EvidenceChainOfCustody } from './evidence-chain-of-custody.entity';

export enum CapsuleStatus {
  DRAFT               = 'DRAFT',
  CAPTURED            = 'CAPTURED',
  QUEUED              = 'QUEUED',
  UPLOADED            = 'UPLOADED',
  AI_PROCESSING       = 'AI_PROCESSING',
  AI_VERIFIED         = 'AI_VERIFIED',
  PENDING_VALIDATION  = 'PENDING_VALIDATION',
  APPROVED            = 'APPROVED',
  REJECTED            = 'REJECTED',
  ANCHORED            = 'ANCHORED',
  PUBLISHED           = 'PUBLISHED',
  ARCHIVED            = 'ARCHIVED',
}

export enum SyncStatus {
  PENDING           = 'PENDING',
  QUEUED            = 'QUEUED',
  UPLOADING         = 'UPLOADING',
  UPLOADED          = 'UPLOADED',
  FAILED            = 'FAILED',
  RECOVERY_REQUIRED = 'RECOVERY_REQUIRED',
  COMPLETE          = 'COMPLETE',
}

export enum PositionCode {
  PRESIDENT   = 'PRESIDENT',
  GOVERNOR    = 'GOVERNOR',
  SENATOR     = 'SENATOR',
  WOMEN_REP   = 'WOMEN_REP',
  MP          = 'MP',
  MCA         = 'MCA',
}

@Entity('evidence_capsules')
@Index(['iebcStationCode'])
@Index(['status'])
@Index(['tenantId'])
@Index(['sha256Hash'])
export class EvidenceCapsule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  // ── Election context ──────────────────────────────────────

  @Column({ name: 'election_year', type: 'smallint' })
  electionYear: number;

  @Column({ name: 'election_id', type: 'uuid', nullable: true })
  electionId: string | null;

  @Column({ name: 'position_code', length: 50 })
  positionCode: PositionCode;

  @Column({ name: 'position_level', length: 30 })
  positionLevel: string;

  // ── NEC Geography (verified + denormalized snapshot) ─────

  @Column({ name: 'iebc_station_code', type: 'char', length: 15 })
  iebcStationCode: string;

  @Column({ name: 'polling_station_name', length: 250 })
  pollingStationName: string;

  @Column({ name: 'ward_code', type: 'char', length: 4 })
  wardCode: string;

  @Column({ name: 'ward_name', length: 150 })
  wardName: string;

  @Column({ name: 'constituency_code', type: 'char', length: 3 })
  constituencyCode: string;

  @Column({ name: 'constituency_name', length: 150 })
  constituencyName: string;

  @Column({ name: 'county_code', type: 'char', length: 3 })
  countyCode: string;

  @Column({ name: 'county_name', length: 150 })
  countyName: string;

  @Column({ name: 'stream_number', type: 'smallint' })
  streamNumber: number;

  @Column({ name: 'registered_voters' })
  registeredVoters: number;

  // ── Agent ─────────────────────────────────────────────────

  @Column({ name: 'agent_user_id', type: 'uuid' })
  agentUserId: string;

  @Column({ name: 'agent_device_id', type: 'uuid', nullable: true })
  agentDeviceId: string | null;

  @Column({ name: 'assigned_party_org', length: 255, nullable: true })
  assignedPartyOrg: string | null;

  // ── Capture timing ────────────────────────────────────────

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  // ── GPS ───────────────────────────────────────────────────

  @Column({ name: 'capture_latitude',  type: 'numeric', precision: 10, scale: 7, nullable: true })
  captureLatitude: number | null;

  @Column({ name: 'capture_longitude', type: 'numeric', precision: 10, scale: 7, nullable: true })
  captureLongitude: number | null;

  @Column({ name: 'capture_altitude',  type: 'numeric', precision: 8, scale: 2, nullable: true })
  captureAltitude: number | null;

  @Column({ name: 'capture_accuracy_meters', type: 'numeric', precision: 6, scale: 2, nullable: true })
  captureAccuracyMeters: number | null;

  // ── Status ────────────────────────────────────────────────

  @Column({
    type: 'varchar', length: 30,
    default: CapsuleStatus.DRAFT,
    enum: CapsuleStatus,
  })
  status: CapsuleStatus;

  // ── Trust anchoring ───────────────────────────────────────

  @Column({ name: 'sha256_hash', type: 'char', length: 64, nullable: true })
  sha256Hash: string | null;

  @Column({ name: 'trust_anchor_batch_id', type: 'uuid', nullable: true })
  trustAnchorBatchId: string | null;

  /** PENDING | HEDERA_ONLY | TSA_ONLY | DUAL_ANCHORED | FAILED */
  @Column({ name: 'anchor_status', length: 30, nullable: true })
  anchorStatus: string | null;

  @Column({ name: 'anchored_at', type: 'timestamptz', nullable: true })
  anchoredAt: Date | null;

  @Column({ name: 's3_object_key', length: 500, nullable: true })
  s3ObjectKey: string | null;

  @Column({ name: 's3_locked', default: false })
  s3Locked: boolean;

  // ── AI results ────────────────────────────────────────────

  @Column({ name: 'ai_confidence_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  aiConfidenceScore: number | null;

  @Column({ name: 'ai_processed_at', type: 'timestamptz', nullable: true })
  aiProcessedAt: Date | null;

  @Column({ name: 'ai_flagged', default: false })
  aiFlagged: boolean;

  // ── Validation ────────────────────────────────────────────

  @Column({ name: 'validated_by', type: 'uuid', nullable: true })
  validatedBy: string | null;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @Column({ name: 'validation_decision', length: 20, nullable: true })
  validationDecision: string | null;

  // ── Publication ───────────────────────────────────────────

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'publication_version', type: 'smallint', default: 0 })
  publicationVersion: number;

  // ── Sync ──────────────────────────────────────────────────

  @Column({
    name: 'sync_status',
    type: 'varchar', length: 30,
    default: SyncStatus.PENDING,
    enum: SyncStatus,
  })
  syncStatus: SyncStatus;

  @Column({ name: 'sync_attempts', type: 'smallint', default: 0 })
  syncAttempts: number;

  @Column({ name: 'sync_last_error', type: 'text', nullable: true })
  syncLastError: string | null;

  @Column({ name: 'sync_completed_at', type: 'timestamptz', nullable: true })
  syncCompletedAt: Date | null;

  // ── Recovery ─────────────────────────────────────────────

  @Column({ name: 'is_recovery', default: false })
  isRecovery: boolean;

  @Column({ name: 'recovery_agent_id', type: 'uuid', nullable: true })
  recoveryAgentId: string | null;

  @Column({ name: 'recovery_reason', type: 'text', nullable: true })
  recoveryReason: string | null;

  @Column({ name: 'original_capsule_id', type: 'uuid', nullable: true })
  originalCapsuleId: string | null;

  // ── Audit ─────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  // ── Relations ─────────────────────────────────────────────

  @OneToMany(() => EvidenceImage, (i) => i.capsule)
  images: EvidenceImage[];

  @OneToMany(() => EvidenceHash, (h) => h.capsule)
  hashes: EvidenceHash[];

  @OneToMany(() => EvidenceChainOfCustody, (c) => c.capsule)
  custodyEvents: EvidenceChainOfCustody[];
}
