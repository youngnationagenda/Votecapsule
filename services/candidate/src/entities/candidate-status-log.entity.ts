// ============================================================
// VoteCapsule™ — Candidate Status Log Entity
// candidate-service/src/entities/candidate-status-log.entity.ts
//
// Immutable audit trail of every candidate status transition.
// Supports legal challenges, IEBC review, and observer access.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne,
  JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { Candidate } from './candidate.entity';

@Entity('candidate_status_log')
@Index('idx_csl_candidate', ['candidateId'])
@Index('idx_csl_changed',   ['changedAt'])
export class CandidateStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'candidate_id' })
  @Index()
  candidateId: string;

  @Column({ type: 'varchar', length: 30, name: 'from_status', nullable: true })
  fromStatus: string | null;

  @Column({ type: 'varchar', length: 30, name: 'to_status' })
  toStatus: string;

  /** UUID of the Identity Service user who made this change */
  @Column({ type: 'uuid', name: 'changed_by' })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 300, name: 'gazette_ref', nullable: true })
  gazetteRef: string | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  // ── Relations ─────────────────────────────────────────────
  @ManyToOne(() => Candidate, (c) => c.statusLog)
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;
}
