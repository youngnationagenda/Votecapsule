// ============================================================
// VoteCapsule — AI Anomaly Event Entity
// services/ai/src/entities/ai-anomaly-event.entity.ts
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { AiVerificationJob } from './ai-verification-job.entity';

export enum AnomalyType {
  DUPLICATE_CAPSULE             = 'DUPLICATE_CAPSULE',
  IMAGE_MANIPULATION            = 'IMAGE_MANIPULATION',
  INVALID_STATION_CODE          = 'INVALID_STATION_CODE',
  VOTE_TOTAL_EXCEEDS_REGISTERED = 'VOTE_TOTAL_EXCEEDS_REGISTERED',
  ZERO_VOTES_ALL_CANDIDATES     = 'ZERO_VOTES_ALL_CANDIDATES',
  MISSING_SIGNATURE             = 'MISSING_SIGNATURE',
  MISSING_STAMP                 = 'MISSING_STAMP',
  ARITHMETIC_ERROR              = 'ARITHMETIC_ERROR',
  UNUSUAL_VOTE_PATTERN          = 'UNUSUAL_VOTE_PATTERN',
  FORM_NOT_RECOGNISED           = 'FORM_NOT_RECOGNISED',
  LOW_IMAGE_QUALITY             = 'LOW_IMAGE_QUALITY',
  STATION_CODE_MISMATCH         = 'STATION_CODE_MISMATCH',
  POSITION_MISMATCH             = 'POSITION_MISMATCH',
}

export enum AnomalySeverity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ReviewOutcome {
  CONFIRMED      = 'CONFIRMED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  INCONCLUSIVE   = 'INCONCLUSIVE',
}

@Entity('ai_anomaly_events')
@Index(['jobId'])
@Index(['capsuleId'])
@Index(['anomalyType'])
export class AiAnomalyEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({ name: 'anomaly_type', length: 50, enum: AnomalyType })
  anomalyType: AnomalyType;

  @Column({ name: 'severity', length: 20, default: AnomalySeverity.MEDIUM, enum: AnomalySeverity })
  severity: AnomalySeverity;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'evidence_data', type: 'jsonb', nullable: true })
  evidenceData: Record<string, unknown> | null;

  @Column({ name: 'auto_escalated', default: false })
  autoEscalated: boolean;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_outcome', length: 20, nullable: true, enum: ReviewOutcome })
  reviewOutcome: ReviewOutcome | null;

  @CreateDateColumn({ name: 'detected_at' })
  detectedAt: Date;

  @ManyToOne(() => AiVerificationJob, (j) => j.anomalies)
  @JoinColumn({ name: 'job_id' })
  job: AiVerificationJob;
}
