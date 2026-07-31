// ============================================================
// VoteCapsule™ — Election Position Entity
// candidate-service/src/entities/election-position.entity.ts
//
// Every elective office contested in a given election.
// Geographic scope uses NEC iebc_codes — NEVER duplicated names.
// Geography Service (NEC SSoT) resolves names on demand.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Election }   from './election.entity';
import { Candidate }  from './candidate.entity';

export enum GeographicLevel {
  NATIONAL      = 'NATIONAL',
  COUNTY        = 'COUNTY',
  CONSTITUENCY  = 'CONSTITUENCY',
  WARD          = 'WARD',
}

export enum PositionCode {
  PRESIDENT   = 'PRESIDENT',
  GOVERNOR    = 'GOVERNOR',
  SENATOR     = 'SENATOR',
  WOMEN_REP   = 'WOMEN_REP',
  MP          = 'MP',
  MCA         = 'MCA',
}

@Entity('candidate_election_positions')
@Index('idx_cep_election', ['electionId'])
@Index('idx_cep_code',     ['positionCode'])
export class ElectionPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'election_id' })
  @Index()
  electionId: string;

  @Column({ type: 'varchar', length: 20, name: 'position_code' })
  positionCode: string;

  @Column({ type: 'varchar', length: 150, name: 'position_name' })
  positionName: string;

  @Column({ type: 'varchar', length: 20, name: 'geographic_level' })
  geographicLevel: GeographicLevel;

  /** NEC iebc_code references — single source of truth in Geography Service */
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true })
  countyCode: string | null;

  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true })
  constituencyCode: string | null;

  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true })
  wardCode: string | null;

  @Column({ type: 'varchar', length: 20, name: 'iebc_form_number', nullable: true })
  iebcFormNumber: string | null;

  @Column({ type: 'smallint', name: 'max_candidates', nullable: true })
  maxCandidates: number | null;

  @Column({ type: 'boolean', name: 'is_running_mate_required', default: false })
  isRunningMateRequired: boolean;

  @Column({ type: 'smallint', name: 'seats_available', default: 1 })
  seatsAvailable: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'smallint', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ─────────────────────────────────────────────
  @ManyToOne(() => Election, (e) => e.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @OneToMany(() => Candidate, (c) => c.position, { cascade: false })
  candidates: Candidate[];
}
