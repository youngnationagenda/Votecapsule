import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('campaign_compliance_reports')
@Index('idx_ccr_campaign', ['campaignId'])
@Unique(['campaignId', 'reportType'])
export class CampaignComplianceReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' })  campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' })    tenantId: string;
  @Column({ type: 'varchar', length: 30, name: 'report_type' }) reportType: string;
  @Column({ type: 'varchar', length: 20, name: 'form_number', nullable: true }) formNumber: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) title: string | null;
  @Column({ type: 'varchar', length: 20, default: 'draft' }) status: string;
  @Column({ type: 'date', name: 'due_date', nullable: true }) dueDate: Date | null;
  @Column({ type: 'timestamptz', name: 'submitted_date', nullable: true }) submittedDate: Date | null;
  @Column({ type: 'text', name: 'file_url', nullable: true }) fileUrl: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'submitted_by', nullable: true }) submittedBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
