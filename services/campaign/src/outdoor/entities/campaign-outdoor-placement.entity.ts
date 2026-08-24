// ============================================================
// VoteCapsule™ — Campaign Outdoor Placement Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { CampaignOutdoorCondition } from './campaign-outdoor-condition.entity';

@Entity('campaign_outdoor_placements')
export class CampaignOutdoorPlacement {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cop_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Index('idx_cop_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'varchar', length: 50, name: 'placement_type' }) placementType: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) description: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7 }) lat: number;
  @Column({ type: 'decimal', precision: 10, scale: 7 }) lng: number;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;

  @Index('idx_cop_ward')
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;

  @Column({ type: 'text', name: 'location_address', nullable: true }) locationAddress: string | null;
  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'width_cm', nullable: true }) widthCm: number | null;
  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'height_cm', nullable: true }) heightCm: number | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) material: string | null;
  @Column({ type: 'date', name: 'installed_date', nullable: true }) installedDate: Date | null;
  @Column({ type: 'date', name: 'removal_date', nullable: true }) removalDate: Date | null;
  @Column({ type: 'boolean', name: 'permit_required', default: false }) permitRequired: boolean;
  @Column({ type: 'varchar', length: 100, name: 'permit_number', nullable: true }) permitNumber: string | null;
  @Column({ type: 'date', name: 'permit_expiry', nullable: true }) permitExpiry: Date | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'installation_cost', default: 0 }) installationCost: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'monthly_rental_cost', default: 0 }) monthlyRentalCost: number;
  @Column({ type: 'varchar', length: 20, name: 'current_condition', default: 'good' }) currentCondition: string;

  @Index('idx_cop_status')
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;

  @Column({ type: 'uuid', name: 'media_id', nullable: true }) mediaId: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToMany(() => CampaignOutdoorCondition, (c) => c.placement)
  conditions: CampaignOutdoorCondition[];
}
