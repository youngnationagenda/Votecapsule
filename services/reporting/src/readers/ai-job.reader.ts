// ============================================================
// VoteCapsule™ — AI Verification Job Reader
// reporting-service/src/readers/ai-job.reader.ts
//
// Read-only TypeORM view onto ai_verification_jobs table.
// The Reporting Service NEVER writes to this table.
// AI Service owns all writes.
//
// This is the source of OCR-extracted vote totals.
// ============================================================
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Read-only projection of ai_verification_jobs.
 * Only the columns needed for vote aggregation are mapped.
 * Full schema lives in migration 013_ai_schema.sql.
 */
@Entity('ai_verification_jobs')
export class AiJobView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'capsule_id', type: 'uuid', unique: true })
  @Index()
  capsuleId: string;

  @Column({ name: 'iebc_station_code', type: 'char', length: 15 })
  iebcStationCode: string;

  @Column({ name: 'position_code', length: 50 })
  positionCode: string;

  @Column({ name: 'election_year', type: 'smallint' })
  electionYear: number;

  @Column({ name: 'county_code', type: 'char', length: 3 })
  countyCode: string;

  @Column({ name: 'status', length: 20 })
  status: string;

  // OCR-extracted vote figures — these are the result aggregation inputs
  @Column({ name: 'extracted_registered_voters', nullable: true })
  extractedRegisteredVoters: number | null;

  @Column({ name: 'extracted_votes_cast', nullable: true })
  extractedVotesCast: number | null;

  @Column({ name: 'extracted_valid_votes', nullable: true })
  extractedValidVotes: number | null;

  @Column({ name: 'extracted_rejected_votes', nullable: true })
  extractedRejectedVotes: number | null;

  // Quality
  @Column({ name: 'overall_confidence', type: 'numeric', precision: 5, scale: 4, nullable: true })
  overallConfidence: number | null;

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @Column({ name: 'arithmetic_valid', nullable: true })
  arithmeticValid: boolean | null;

  @Column({ name: 'routing_decision', length: 20, nullable: true })
  routingDecision: string | null;
}
