// ============================================================
// VoteCapsule — AI Verification Job Entity
// services/ai/src/entities/ai-verification-job.entity.ts
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { AiAnomalyEvent } from './ai-anomaly-event.entity';

export enum AiJobStatus {
  QUEUED     = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
  ESCALATED  = 'ESCALATED',
}

export enum RoutingDecision {
  APPROVE_FOR_REVIEW = 'APPROVE_FOR_REVIEW',  // confidence >= 0.80
  MANUAL_REVIEW      = 'MANUAL_REVIEW',        // confidence 0.60-0.79
  ESCALATE           = 'ESCALATE',             // confidence < 0.60 or fraud signal
}

export enum TextractStatus {
  SUBMITTED         = 'SUBMITTED',
  IN_PROGRESS       = 'IN_PROGRESS',
  SUCCEEDED         = 'SUCCEEDED',
  FAILED            = 'FAILED',
  PARTIAL_SUCCESS   = 'PARTIAL_SUCCESS',
}

@Entity('ai_verification_jobs')
@Index(['capsuleId'], { unique: true })
@Index(['status'])
@Index(['isFlagged'])
export class AiVerificationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'capsule_id', type: 'uuid', unique: true })
  capsuleId: string;

  @Column({ name: 'iebc_station_code', type: 'char', length: 15 })
  iebcStationCode: string;

  @Column({ name: 'position_code', type: 'varchar', length: 50 })
  positionCode: string;

  @Column({ name: 'election_year', type: 'smallint' })
  electionYear: number;

  @Column({ name: 'county_code', type: 'char', length: 3 })
  countyCode: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: AiJobStatus.QUEUED, enum: AiJobStatus })
  status: AiJobStatus;

  @Column({ name: 'queued_at', type: 'timestamptz', default: () => 'NOW()' })
  queuedAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ name: 'textract_job_id', type: 'varchar', length: 255, nullable: true })
  textractJobId: string | null;

  @Column({ name: 'textract_status', type: 'varchar', length: 30, nullable: true, enum: TextractStatus })
  textractStatus: TextractStatus | null;

  @Column({ name: 's3_bucket', type: 'varchar', length: 255, nullable: true })
  s3Bucket: string | null;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: true })
  s3Key: string | null;

  @Column({ name: 'ocr_confidence', type: 'numeric', precision: 5, scale: 4, nullable: true })
  ocrConfidence: number | null;

  @Column({ name: 'form_recognition_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  formRecognitionScore: number | null;

  @Column({ name: 'station_code_match_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  stationCodeMatchScore: number | null;

  @Column({ name: 'position_match_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  positionMatchScore: number | null;

  @Column({ name: 'vote_arithmetic_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  voteArithmeticScore: number | null;

  @Column({ name: 'voter_limit_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  voterLimitScore: number | null;

  @Column({ name: 'overall_confidence', type: 'numeric', precision: 5, scale: 4, nullable: true })
  overallConfidence: number | null;

  @Column({ name: 'routing_decision', type: 'varchar', length: 20, nullable: true, enum: RoutingDecision })
  routingDecision: RoutingDecision | null;

  @Column({ name: 'routing_reason', type: 'text', nullable: true })
  routingReason: string | null;

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @Column({ name: 'flag_reasons', type: 'jsonb', nullable: true })
  flagReasons: string[] | null;

  @Column({ name: 'extracted_station_code', type: 'char', length: 15, nullable: true })
  extractedStationCode: string | null;

  @Column({ name: 'extracted_station_name', type: 'varchar', length: 250, nullable: true })
  extractedStationName: string | null;

  @Column({ name: 'extracted_position', type: 'varchar', length: 100, nullable: true })
  extractedPosition: string | null;

  @Column({ name: 'extracted_stream_number', type: 'smallint', nullable: true })
  extractedStreamNumber: number | null;

  @Column({ name: 'extracted_registered_voters', type: 'integer', nullable: true })
  extractedRegisteredVoters: number | null;

  @Column({ name: 'extracted_votes_cast', type: 'integer', nullable: true })
  extractedVotesCast: number | null;

  @Column({ name: 'extracted_valid_votes', type: 'integer', nullable: true })
  extractedValidVotes: number | null;

  @Column({ name: 'extracted_rejected_votes', type: 'integer', nullable: true })
  extractedRejectedVotes: number | null;

  @Column({ name: 'raw_ocr_text', type: 'text', nullable: true })
  rawOcrText: string | null;

  @Column({ name: 'ocr_blocks', type: 'jsonb', nullable: true })
  ocrBlocks: Record<string, unknown>[] | null;

  @Column({ name: 'station_code_verified', type: 'boolean', nullable: true })
  stationCodeVerified: boolean | null;

  @Column({ name: 'station_name_verified', type: 'boolean', nullable: true })
  stationNameVerified: boolean | null;

  @Column({ name: 'position_verified', type: 'boolean', nullable: true })
  positionVerified: boolean | null;

  @Column({ name: 'voter_limit_respected', type: 'boolean', nullable: true })
  voterLimitRespected: boolean | null;

  @Column({ name: 'arithmetic_valid', type: 'boolean', nullable: true })
  arithmeticValid: boolean | null;

  @Column({ name: 'attempt_count', type: 'smallint', default: 1 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'smallint', default: 3 })
  maxAttempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AiAnomalyEvent, (a) => a.job)
  anomalies: AiAnomalyEvent[];
}
