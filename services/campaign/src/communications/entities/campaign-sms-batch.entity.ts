import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaign_sms_batches')
export class CampaignSmsBatch {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'uuid', name: 'template_id', nullable: true }) templateId: string | null;
  @Column({ type: 'varchar', length: 200, name: 'batch_name', nullable: true }) batchName: string | null;
  @Column({ type: 'jsonb', name: 'audience_filter', default: '{}' }) audienceFilter: Record<string, unknown>;
  @Column({ type: 'timestamptz', name: 'scheduled_at', nullable: true }) scheduledAt: Date | null;
  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true }) sentAt: Date | null;
  @Column({ type: 'int', name: 'total_recipients', default: 0 }) totalRecipients: number;
  @Column({ type: 'int', name: 'sent_count', default: 0 }) sentCount: number;
  @Column({ type: 'int', name: 'delivered_count', default: 0 }) deliveredCount: number;
  @Column({ type: 'int', name: 'failed_count', default: 0 }) failedCount: number;
  @Column({ type: 'int', name: 'pending_count', default: 0 }) pendingCount: number;
  @Column({ type: 'decimal', precision: 8, scale: 4, name: 'cost_per_sms', default: 1.0 }) costPerSms: number;
  @Column({ type: 'varchar', length: 30, default: 'africas_talking' }) provider: string;
  @Column({ type: 'varchar', length: 200, name: 'provider_batch_id', nullable: true }) providerBatchId: string | null;
  @Column({ type: 'varchar', length: 50, name: 'sender_id', nullable: true }) senderId: string | null;
  @Column({ type: 'varchar', length: 20, default: 'draft' }) status: string;
  @Column({ type: 'text', name: 'message_content', nullable: true }) messageContent: string | null;
  @Column({ type: 'uuid', name: 'created_by' }) createdBy: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
