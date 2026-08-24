// ============================================================
// VoteCapsule™ — Campaign Equipment Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { CampaignEquipmentLog } from './campaign-equipment-log.entity';

@Entity('campaign_equipment')
export class CampaignEquipment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_ceq_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Index('idx_ceq_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'varchar', length: 100, name: 'equipment_type' }) equipmentType: string;
  @Column({ type: 'varchar', length: 200 }) name: string;
  @Column({ type: 'int', default: 1 }) quantity: number;
  @Column({ type: 'varchar', length: 100, name: 'serial_number', nullable: true }) serialNumber: string | null;

  @Index('idx_ceq_status')
  @Column({ type: 'varchar', length: 30, default: 'available' }) status: string;

  @Column({ type: 'uuid', name: 'assigned_event_id', nullable: true }) assignedEventId: string | null;
  @Column({ type: 'varchar', length: 20, name: 'current_condition', default: 'good' }) currentCondition: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'estimated_value', nullable: true }) estimatedValue: number | null;
  @Column({ type: 'varchar', length: 20, name: 'ownership_type', default: 'owned' }) ownershipType: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToMany(() => CampaignEquipmentLog, (l) => l.equipment)
  logs: CampaignEquipmentLog[];
}
