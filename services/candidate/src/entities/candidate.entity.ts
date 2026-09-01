// ============================================================
// VoteCapsule™ — Candidate Entity
// candidate-service/src/entities/candidate.entity.ts
//
// A person contesting a specific position in a specific election.
// Geography is referenced by NEC iebc_code — NEVER denormalised.
// Geography Service (NEC SSoT) provides county/constituency/ward names.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Election }         from './election.entity';
import { ElectionPosition } from './election-position.entity';
import { PoliticalParty }   from './political-party.entity';
import { CandidateStatusLog }    from './candidate-status-log.entity';
import { CandidateBallotRef }    from './candidate-ballot-ref.entity';

export enum CandidateStatus {
  PENDING_NOMINATION = 'PENDING_NOMINATION',
  NOMINATED          = 'NOMINATED',
  APPROVED           = 'APPROVED',
  WITHDRAWN          = 'WITHDRAWN',
  DISQUALIFIED       = 'DISQUALIFIED',
  ELECTED            = 'ELECTED',
  NOT_ELECTED        = 'NOT_ELECTED',
}

@Entity('candidate_candidates')
@Index('idx_cc_election',    ['electionId'])
@Index('idx_cc_position',    ['positionId'])
@Index('idx_cc_party',       ['partyId'])
@Index('idx_cc_tenant',      ['tenantId'])
@Index('idx_cc_status',      ['status'])
@Index('idx_cc_county',      ['countyCode'])
@Index('idx_cc_const',       ['constituencyCode'])
@Index('idx_cc_ward',        ['wardCode'])
@Index('idx_cc_national_id', ['nationalId'])
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'election_id' })
  electionId: string;

  @Column({ type: 'uuid', name: 'position_id' })
  positionId: string;

  @Column({ type: 'uuid', name: 'party_id', nullable: true })
  partyId: string | null;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  // ── Identity ───────────────────────────────────────────────
  @Column({ type: 'varchar', length: 300, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 150, name: 'short_name', nullable: true })
  shortName: string | null;

  @Column({ type: 'varchar', length: 30, name: 'national_id' })
  nationalId: string;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  // ── Sponsorship & Promotion ────────────────────────────────

  /**
   * How this candidate enters the election:
   *   PARTY_SPONSORED   — Won a party nomination OR directly chosen by party
   *   INDEPENDENT       — Self-sponsored, no party affiliation on ballot
   *   SELF_SPONSORED    — Party member in a PARTY_NOMINATION election (pre-result)
   *   COALITION         — Sponsored by a coalition of parties
   */
  @Column({ type: 'varchar', length: 20, name: 'sponsorship_type', default: 'PARTY_SPONSORED' })
  sponsorshipType: string;

  @Column({ type: 'uuid', name: 'nomination_election_id', nullable: true })
  nominationElectionId: string | null;
  // For PARTY_SPONSORED in GENERAL: which nomination election produced this candidate?

  @Column({ type: 'uuid', name: 'promoted_from_candidate_id', nullable: true })
  promotedFromCandidateId: string | null;
  // The original nomination candidate record that won and was promoted here

  @Column({ type: 'boolean', name: 'nomination_won', nullable: true })
  nominationWon: boolean | null;
  // For PARTY_NOMINATION elections: TRUE=won party ticket, FALSE=lost, NULL=undecided

  // ── Classification (kept for backward compat) ──────────────
  @Column({ type: 'boolean', name: 'is_independent', default: false })
  isIndependent: boolean;
  // Derived from sponsorshipType === 'INDEPENDENT' — kept for legacy queries

  @Column({ type: 'smallint', name: 'ballot_number', nullable: true })
  ballotNumber: number | null;

  @Column({ type: 'smallint', name: 'ballot_order', nullable: true })
  ballotOrder: number | null;

  // ── Running mate (Presidential/Governor only) ──────────────
  @Column({ type: 'varchar', length: 300, name: 'running_mate_name', nullable: true })
  runningMateName: string | null;

  @Column({ type: 'varchar', length: 30, name: 'running_mate_national_id', nullable: true })
  runningMateNationalId: string | null;

  // ── Geography — NEC SSoT iebc_codes (NEVER duplicated names) ──
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true })
  countyCode: string | null;

  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true })
  constituencyCode: string | null;

  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true })
  wardCode: string | null;

  // ── Media / Documents ──────────────────────────────────────
  @Column({ type: 'varchar', length: 500, name: 'photograph_url', nullable: true })
  photographUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'symbol_url', nullable: true })
  symbolUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'nomination_cert_url', nullable: true })
  nominationCertUrl: string | null;

  @Column({ type: 'varchar', length: 100, name: 'nomination_cert_number', nullable: true })
  nominationCertNumber: string | null;

  // ── Status lifecycle ──────────────────────────────────────
  @Column({
    type: 'varchar', length: 30,
    default: CandidateStatus.PENDING_NOMINATION,
  })
  status: CandidateStatus;

  @Column({ type: 'text', name: 'disqualification_reason', nullable: true })
  disqualificationReason: string | null;

  @Column({ type: 'date', name: 'withdrawal_date', nullable: true })
  withdrawalDate: Date | null;

  @Column({ type: 'date', name: 'nomination_date', nullable: true })
  nominationDate: Date | null;

  @Column({ type: 'varchar', length: 300, name: 'gazette_reference', nullable: true })
  gazetteReference: string | null;

  // ── Demographics (IEBC compliance reporting) ──────────────
  /** Youth: age ≤35 at time of nomination — used for IEBC youth compliance reports */
  @Column({ type: 'boolean', name: 'is_youth', default: false })
  isYouth: boolean;

  /** Person Living With Disability — IEBC PLWD compliance reporting */
  @Column({ type: 'boolean', name: 'is_plwd', default: false })
  isPLWD: boolean;

  // ── Audit ─────────────────────────────────────────────────
  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ─────────────────────────────────────────────
  @ManyToOne(() => Election, (e) => e.candidates)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @ManyToOne(() => ElectionPosition, (p) => p.candidates)
  @JoinColumn({ name: 'position_id' })
  position: ElectionPosition;

  @ManyToOne(() => PoliticalParty, (p) => p.candidates, { nullable: true })
  @JoinColumn({ name: 'party_id' })
  party: PoliticalParty | null;

  @OneToMany(() => CandidateStatusLog, (l) => l.candidate, { cascade: false })
  statusLog: CandidateStatusLog[];

  @OneToMany(() => CandidateBallotRef, (r) => r.candidate, { cascade: false })
  ballotReferences: CandidateBallotRef[];
}
