// ============================================================
// VoteCapsule™ — Publication Entity
// reporting-service/src/entities/publication.entity.ts
//
// Immutable record of each official result publication event.
// AI ASSISTS, HUMANS DECIDE — only a human Election Authority
// official can create a publication.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ResultSnapshot } from './result-snapshot.entity';

@Entity('reporting_publications')
@Index('idx_rp_tenant',   ['tenantId'])
@Index('idx_rp_election', ['electionYear'])
@Index('idx_rp_position', ['positionCode'])
@Index('idx_rp_pub_at',   ['publishedAt'])
export class Publication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'smallint', name: 'election_year' })
  electionYear: number;

  @Column({ type: 'varchar', length: 20, name: 'position_code' })
  positionCode: string;

  @Column({ type: 'varchar', length: 20, name: 'scope_level' })
  scopeLevel: string;

  @Column({ type: 'varchar', length: 20, name: 'scope_code', nullable: true })
  scopeCode: string | null;

  @Column({ type: 'uuid', name: 'snapshot_id' })
  snapshotId: string;

  // ── Vote totals at publication time (immutable) ──────────
  @Column({ type: 'int', name: 'stations_reporting', default: 0 })
  stationsReporting: number;

  @Column({ type: 'int', name: 'total_stations', default: 0 })
  totalStations: number;

  @Column({ type: 'int', name: 'votes_cast', default: 0 })
  votesCast: number;

  @Column({ type: 'int', name: 'valid_votes', default: 0 })
  validVotes: number;

  @Column({ type: 'int', name: 'rejected_ballots', default: 0 })
  rejectedBallots: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'turnout_percent', default: 0 })
  turnoutPercent: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'completion_percent', default: 0 })
  completionPercent: number;

  // ── Authorisation ────────────────────────────────────────
  @Column({ type: 'uuid', name: 'published_by' })
  publishedBy: string;

  @Column({ type: 'varchar', length: 300, name: 'published_by_name', nullable: true })
  publishedByName: string | null;

  @Column({ type: 'varchar', length: 300, name: 'gazette_reference', nullable: true })
  gazetteReference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ type: 'smallint', name: 'publication_version', default: 1 })
  publicationVersion: number;

  @Column({ type: 'timestamptz', name: 'published_at', default: () => 'NOW()' })
  publishedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ────────────────────────────────────────────
  @ManyToOne(() => ResultSnapshot, (s) => s.publications)
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: ResultSnapshot;
}
