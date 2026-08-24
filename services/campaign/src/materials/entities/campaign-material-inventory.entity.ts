// ============================================================
// VoteCapsule™ — Campaign Material Inventory Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_material_inventory')
export class CampaignMaterialInventory {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cmi_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Index('idx_cmi_type')
  @Column({ type: 'uuid', name: 'material_type_id' }) materialTypeId: string;

  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;

  @Index('idx_cmi_ward')
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;

  @Column({ type: 'int', name: 'quantity_received', default: 0 }) quantityReceived: number;
  @Column({ type: 'int', name: 'quantity_distributed', default: 0 }) quantityDistributed: number;
  @Column({ type: 'int', name: 'quantity_damaged', default: 0 }) quantityDamaged: number;
  // quantity_remaining is a generated column in the DB — read-only here
  @Column({ type: 'int', name: 'quantity_remaining', insert: false, update: false, nullable: true }) quantityRemaining: number | null;
  @Column({ type: 'uuid', name: 'last_updated_by', nullable: true }) lastUpdatedBy: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
