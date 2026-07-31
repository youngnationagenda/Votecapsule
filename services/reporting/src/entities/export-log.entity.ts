// ============================================================
// VoteCapsule™ — Export Log Entity
// reporting-service/src/entities/export-log.entity.ts
//
// Every PDF, Excel, CSV export is logged for IEBC audit trail.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, Index,
} from 'typeorm';

export enum ExportFormat {
  PDF   = 'PDF',
  EXCEL = 'EXCEL',
  CSV   = 'CSV',
}

export enum ExportStatus {
  PENDING  = 'PENDING',
  COMPLETE = 'COMPLETE',
  FAILED   = 'FAILED',
}

@Entity('reporting_export_log')
@Index('idx_rel_tenant', ['tenantId'])
@Index('idx_rel_user',   ['requestedBy'])
@Index('idx_rel_format', ['exportFormat'])
@Index('idx_rel_at',     ['requestedAt'])
export class ExportLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'requested_by' })
  requestedBy: string;

  @Column({ type: 'varchar', length: 10, name: 'export_format' })
  exportFormat: ExportFormat;

  @Column({ type: 'varchar', length: 20, name: 'scope_level' })
  scopeLevel: string;

  @Column({ type: 'varchar', length: 20, name: 'position_code', nullable: true })
  positionCode: string | null;

  @Column({ type: 'smallint', name: 'election_year', nullable: true })
  electionYear: number | null;

  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true })
  countyCode: string | null;

  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true })
  constituencyCode: string | null;

  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true })
  wardCode: string | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: ExportStatus.PENDING })
  status: ExportStatus;

  @Column({ type: 'int', name: 'row_count', nullable: true })
  rowCount: number | null;

  @Column({ type: 'int', name: 'file_size_bytes', nullable: true })
  fileSizeBytes: number | null;

  @Column({ type: 'varchar', length: 500, name: 's3_key', nullable: true })
  s3Key: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
