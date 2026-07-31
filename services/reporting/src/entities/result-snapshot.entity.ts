// ============================================================
// VoteCapsule™ — Result Snapshot Entity
// reporting-service/src/entities/result-snapshot.entity.ts
//
// Pre-computed aggregation at a geographic scope level.
// Recomputed on demand; never updated in-place after PUBLISHED.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Publication } from './publication.entity';

export enum ScopeLevel {
  NATIONAL     = 'NATIONAL',
  COUNTY       = 'COUNTY',
  CONSTITUENCY = 'CONSTITUENCY',
  WARD         = 'WARD',
  STATION      = 'STATION',
}

export enum PublicationStatus {
  DRAFT     = 'DRAFT',
  VERIFIED  = 'VERIFIED',
  PUBLISHED = 'PUBLISHED',
}

@Entity('reporting_result_snapshots')
@Index('idx_rrs_tenant',     ['tenantId'])
@Index('idx_rrs_election',   ['electionYear'])
@Index('idx_rrs_position',   ['positionCode'])
@Index('idx_rrs_scope',      ['scopeLevel'])
@Index('idx_rrs_county',     ['countyCode'])
@Index('idx_rrs_pub_status', ['publicationStatus'])
export class ResultSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'election_id', nullable: true })
  electionId: string | null;

  @Column({ type: 'smallint', name: 'election_year' })
  electionYear: number;

  @Column({ type: 'varchar', length: 20, name: 'position_code' })
  positionCode: string;

  // ── Geographic scope ────────────────────────────────────
  @Column({ type: 'varchar', length: 20, name: 'scope_level' })
  scopeLevel: ScopeLevel;

  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true })
  countyCode: string | null;

  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true })
  constituencyCode: string | null;

  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true })
  wardCode: string | null;

  @Column({ type: 'char', length: 15, name: 'iebc_station_code', nullable: true })
  iebcStationCode: string | null;

  @Column({ type: 'varchar', length: 250, name: 'scope_name', nullable: true })
  scopeName: string | null;

  // ── Coverage ────────────────────────────────────────────
  @Column({ type: 'int', name: 'total_stations', default: 0 })
  totalStations: number;

  @Column({ type: 'int', name: 'stations_reporting', default: 0 })
  stationsReporting: number;

  @Column({ type: 'int', name: 'stations_pending', default: 0 })
  stationsPending: number;

  @Column({ type: 'int', name: 'stations_rejected', default: 0 })
  stationsRejected: number;

  @Column({ type: 'int', name: 'stations_flagged', default: 0 })
  stationsFlagged: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'completion_percent', default: 0 })
  completionPercent: number;

  // ── Vote totals ─────────────────────────────────────────
  @Column({ type: 'int', name: 'registered_voters', default: 0 })
  registeredVoters: number;

  @Column({ type: 'int', name: 'votes_cast', default: 0 })
  votesCast: number;

  @Column({ type: 'int', name: 'valid_votes', default: 0 })
  validVotes: number;

  @Column({ type: 'int', name: 'rejected_ballots', default: 0 })
  rejectedBallots: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'turnout_percent', default: 0 })
  turnoutPercent: number;

  // ── Quality ─────────────────────────────────────────────
  @Column({ type: 'numeric', precision: 5, scale: 4, name: 'avg_ai_confidence', nullable: true })
  avgAiConfidence: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, name: 'min_ai_confidence', nullable: true })
  minAiConfidence: number | null;

  @Column({ type: 'int', name: 'anomaly_count', default: 0 })
  anomalyCount: number;

  // ── Snapshot state ──────────────────────────────────────
  @Column({ type: 'boolean', name: 'is_final', default: false })
  isFinal: boolean;

  @Column({ type: 'timestamptz', name: 'computed_at', default: () => 'NOW()' })
  computedAt: Date;

  @Column({ type: 'int', name: 'compute_duration_ms', nullable: true })
  computeDurationMs: number | null;

  // ── Publication ─────────────────────────────────────────
  @Column({
    type: 'varchar', length: 20, name: 'publication_status',
    default: PublicationStatus.DRAFT,
  })
  publicationStatus: PublicationStatus;

  @Column({ type: 'uuid', name: 'verified_by', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'uuid', name: 'published_by', nullable: true })
  publishedBy: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ────────────────────────────────────────────
  @OneToMany(() => Publication, (p) => p.snapshot, { cascade: false })
  publications: Publication[];
}
