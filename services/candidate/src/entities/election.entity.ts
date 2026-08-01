// ============================================================
// VoteCapsule™ — Election Entity
// candidate-service/src/entities/election.entity.ts
//
// An election cycle. Multi-tenant — each election authority
// (tenant) manages their own elections.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { ElectionPosition } from './election-position.entity';
import { Candidate }        from './candidate.entity';

export enum ElectionType {
  GENERAL    = 'GENERAL',
  BY_ELECTION = 'BY_ELECTION',
  REPEAT     = 'REPEAT',
}

export enum ElectionStatus {
  PLANNING           = 'PLANNING',           // Setup phase — not yet public
  NOMINATION         = 'NOMINATION',         // Candidates can register
  CAMPAIGN           = 'CAMPAIGN',           // Campaigning allowed
  ACTIVE             = 'ACTIVE',             // Voting day — evidence capture open
  TALLYING           = 'TALLYING',           // Polls closed, counting in progress
  RESULTS_PUBLISHED  = 'RESULTS_PUBLISHED',  // Official results published
  CLOSED             = 'CLOSED',             // Archived — read-only
  CANCELLED          = 'CANCELLED',          // Election cancelled
}

@Entity('candidate_elections')
@Index('idx_ce_tenant', ['tenantId'])
@Index('idx_ce_year',   ['electionYear'])
@Index('idx_ce_status', ['status'])
export class Election {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'varchar', length: 50, name: 'election_type',
    default: ElectionType.GENERAL,
  })
  electionType: ElectionType;

  @Column({ type: 'smallint', name: 'election_year' })
  electionYear: number;

  @Column({ type: 'date', name: 'election_date', nullable: true })
  electionDate: Date | null;

  @Column({ type: 'date', name: 'nomination_deadline', nullable: true })
  nominationDeadline: Date | null;

  @Column({ type: 'date', name: 'campaign_start_date', nullable: true })
  campaignStartDate: Date | null;

  @Column({ type: 'date', name: 'campaign_end_date', nullable: true })
  campaignEndDate: Date | null;

  @Column({ type: 'varchar', length: 300, name: 'gazette_reference', nullable: true })
  gazetteReference: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar', length: 30,
    default: ElectionStatus.PLANNING,
  })
  status: ElectionStatus;

  @Column({ type: 'smallint', name: 'nec_election_year', nullable: true })
  necElectionYear: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ─────────────────────────────────────────────
  @OneToMany(() => ElectionPosition, (p) => p.election, { cascade: false })
  positions: ElectionPosition[];

  @OneToMany(() => Candidate, (c) => c.election, { cascade: false })
  candidates: Candidate[];
}
