import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ComplianceReportStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('compliance_reports')
@Index(['tenantId', 'createdAt'])
@Index(['reportType', 'periodEnd'])
export class ComplianceReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  // -- Period covered
  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd: Date;

  // -- Content
  @Column({ name: 'report_data', type: 'jsonb' })
  reportData: Record<string, unknown>;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string | null;

  // -- Status
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: ComplianceReportStatus.DRAFT,
  })
  status: ComplianceReportStatus;

  @Column({ name: 'generated_by', type: 'varchar', length: 50, default: 'system' })
  generatedBy: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  // -- Storage
  @Column({ name: 'file_key', type: 'varchar', length: 500, nullable: true })
  fileKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
