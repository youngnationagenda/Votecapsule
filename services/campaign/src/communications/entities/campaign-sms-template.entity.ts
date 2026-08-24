import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaign_sms_templates')
export class CampaignSmsTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 200, name: 'template_name' }) templateName: string;
  @Column({ type: 'text' }) body: string;
  @Column({ type: 'simple-array', nullable: true }) variables: string[];
  @Column({ type: 'varchar', length: 50, default: 'general' }) category: string;
  @Column({ type: 'varchar', length: 20, name: 'approval_status', default: 'draft' }) approvalStatus: string;
  @Column({ type: 'uuid', name: 'approved_by', nullable: true }) approvedBy: string | null;
  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true }) approvedAt: Date | null;
  @Column({ type: 'text', name: 'rejection_reason', nullable: true }) rejectionReason: string | null;
  @Column({ type: 'int', name: 'usage_count', default: 0 }) usageCount: number;
  @Column({ type: 'uuid', name: 'created_by' }) createdBy: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
