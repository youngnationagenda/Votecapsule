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
  GENERAL           = 'GENERAL',           // IEBC-managed general election
  BY_ELECTION       = 'BY_ELECTION',       // IEBC by-election for a vacated seat
  REPEAT            = 'REPEAT',            // Court-ordered repeat election
  PARTY_NOMINATION  = 'PARTY_NOMINATION',  // Political party internal nomination
                                            // Uses the same IEBC form chain + evidence
                                            // capture infrastructure for auditability.
                                            // Tenant = the political party.
                                            // Candidates = party members only.
                                            // Winner promoted to GENERAL election.
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

  // ── Party Nomination fields ────────────────────────────────
  // Only populated when electionType = PARTY_NOMINATION

  @Column({ type: 'uuid', name: 'party_id', nullable: true })
  @Index()
  partyId: string | null;  // The political party running this nomination

  @Column({ type: 'uuid', name: 'parent_election_id', nullable: true })
  parentElectionId: string | null;
  // FK → the GENERAL election this nomination feeds into.
  // Winners get promoted to the parent election as PARTY_SPONSORED candidates.

  @Column({ type: 'date', name: 'nomination_voting_date', nullable: true })
  nominationVotingDate: Date | null;

  @Column({ type: 'numeric', name: 'nomination_fee_kes', precision: 10, scale: 2, default: 0 })
  nominationFeeKes: number;

  @Column({ type: 'smallint', name: 'max_candidates_per_position', nullable: true })
  maxCandidatesPerPosition: number | null;

  @Column({ type: 'boolean', name: 'results_public', default: false })
  resultsPublic: boolean;
  // Whether nomination results are visible outside the party portal

  // ── Relations ─────────────────────────────────────────────
  @OneToMany(() => ElectionPosition, (p) => p.election, { cascade: false })
  positions: ElectionPosition[];

  @OneToMany(() => Candidate, (c) => c.election, { cascade: false })
  candidates: Candidate[];
}
