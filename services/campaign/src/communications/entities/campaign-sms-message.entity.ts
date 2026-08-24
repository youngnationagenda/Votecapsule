// ============================================================
// VoteCapsule™ — Campaign SMS Message Entity (per-recipient record)
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_sms_messages')
export class CampaignSmsMessage {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column({ type: 'uuid', name: 'batch_id' }) batchId: string;

  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'varchar', length: 20, name: 'recipient_phone' }) phoneNumber: string;
  @Column({ type: 'text', name: 'rendered_body' }) messageContent: string;
  @Column({ type: 'varchar', length: 100, name: 'provider_message_id', nullable: true }) providerMessageId: string | null;
  @Column({ type: 'varchar', length: 30, default: 'queued' }) status: string;
  // queued | sent | delivered | failed | undelivered
  @Column({ type: 'decimal', precision: 8, scale: 4, name: 'cost', default: 0.80 }) costKes: number;
  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true }) sentAt: Date | null;
  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true }) deliveredAt: Date | null;
  @Column({ type: 'text', name: 'failure_reason', nullable: true }) failureReason: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
