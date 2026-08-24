// ============================================================
// VoteCapsule™ — Campaign Equipment Log Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { CampaignEquipment } from './campaign-equipment.entity';

@Entity('campaign_equipment_logs')
export class CampaignEquipmentLog {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cel_equipment')
  @Column({ type: 'uuid', name: 'equipment_id' }) equipmentId: string;

  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 30, name: 'previous_status', nullable: true }) previousStatus: string | null;
  @Column({ type: 'varchar', length: 30, name: 'new_status' }) newStatus: string;
  @Column({ type: 'uuid', name: 'changed_by' }) changedBy: string;
  @Column({ type: 'uuid', name: 'event_id', nullable: true }) eventId: string | null;
  @Column({ type: 'uuid', name: 'evidence_media_id', nullable: true }) evidenceMediaId: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'timestamptz', name: 'changed_at', default: () => 'NOW()' }) changedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => CampaignEquipment, (e) => e.logs)
  @JoinColumn({ name: 'equipment_id' })
  equipment: CampaignEquipment;
}
