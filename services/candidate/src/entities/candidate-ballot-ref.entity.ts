// ============================================================
// VoteCapsule™ — Candidate Ballot Reference Entity
// candidate-service/src/entities/candidate-ballot-ref.entity.ts
//
// Stores how each candidate appears on the printed IEBC ballot.
// AI Verification Service uses this table to cross-validate
// OCR-extracted candidate names and ballot numbers from Form 35A.
//
// Ballot names must match EXACTLY what is printed on the form.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne,
  JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { Candidate }        from './candidate.entity';
import { ElectionPosition } from './election-position.entity';

@Entity('candidate_ballot_references')
@Index('idx_cbr_candidate', ['candidateId'])
@Index('idx_cbr_position',  ['positionId'])
@Index('idx_cbr_station',   ['iebcStationCode'])
@Index('idx_cbr_form',      ['formNumber'])
export class CandidateBallotRef {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'candidate_id' })
  @Index()
  candidateId: string;

  @Column({ type: 'uuid', name: 'position_id' })
  positionId: string;

  /**
   * NULL = this ballot reference applies to ALL polling stations
   * in the candidate's geographic scope.
   * Non-null = specific station override (edge case).
   */
  @Column({ type: 'char', length: 15, name: 'iebc_station_code', nullable: true })
  iebcStationCode: string | null;

  /** Name EXACTLY as printed on the physical ballot */
  @Column({ type: 'varchar', length: 300, name: 'ballot_name' })
  ballotName: string;

  /** Symbol or logo description used to aid OCR matching */
  @Column({ type: 'varchar', length: 100, name: 'ballot_symbol', nullable: true })
  ballotSymbol: string | null;

  /** Number on the printed ballot (for AI cross-validation) */
  @Column({ type: 'smallint', name: 'ballot_number' })
  ballotNumber: number;

  /** IEBC form reference — e.g. "Form 35A", "Form 35B", "Form 37" */
  @Column({ type: 'varchar', length: 20, name: 'form_number', nullable: true })
  formNumber: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ─────────────────────────────────────────────
  @ManyToOne(() => Candidate, (c) => c.ballotReferences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @ManyToOne(() => ElectionPosition)
  @JoinColumn({ name: 'position_id' })
  position: ElectionPosition;
}
