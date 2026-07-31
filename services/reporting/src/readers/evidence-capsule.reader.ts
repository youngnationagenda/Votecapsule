// ============================================================
// VoteCapsule™ — Evidence Capsule Reader
// reporting-service/src/readers/evidence-capsule.reader.ts
//
// Read-only TypeORM view onto evidence_capsules table.
// The Reporting Service NEVER writes to this table.
// Evidence Service owns all writes.
// ============================================================
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Read-only projection of evidence_capsules.
 * Only the columns needed for aggregation are mapped here.
 * Full schema lives in migration 011_evidence_schema.sql.
 */
@Entity('evidence_capsules')
export class EvidenceCapsuleView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'election_year', type: 'smallint' })
  electionYear: number;

  @Column({ name: 'election_id', type: 'uuid', nullable: true })
  electionId: string | null;

  @Column({ name: 'position_code', length: 50 })
  positionCode: string;

  // NEC geography snapshot (stored at capture time)
  @Column({ name: 'iebc_station_code', type: 'char', length: 15 })
  @Index()
  iebcStationCode: string;

  @Column({ name: 'polling_station_name', length: 250 })
  pollingStationName: string;

  @Column({ name: 'ward_code', type: 'char', length: 4 })
  wardCode: string;

  @Column({ name: 'ward_name', length: 150 })
  wardName: string;

  @Column({ name: 'constituency_code', type: 'char', length: 3 })
  constituencyCode: string;

  @Column({ name: 'constituency_name', length: 150 })
  constituencyName: string;

  @Column({ name: 'county_code', type: 'char', length: 3 })
  countyCode: string;

  @Column({ name: 'county_name', length: 150 })
  countyName: string;

  @Column({ name: 'registered_voters' })
  registeredVoters: number;

  // Status
  @Column({ length: 30 })
  @Index()
  status: string;

  // AI
  @Column({ name: 'ai_confidence_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  aiConfidenceScore: number | null;

  @Column({ name: 'ai_flagged', default: false })
  aiFlagged: boolean;

  // Publication
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'trust_anchor_batch_id', type: 'uuid', nullable: true })
  trustAnchorBatchId: string | null;

  @Column({ name: 'anchor_status', length: 30, nullable: true })
  anchorStatus: string | null;

  @Column({ name: 'anchored_at', type: 'timestamptz', nullable: true })
  anchoredAt: Date | null;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;
}
