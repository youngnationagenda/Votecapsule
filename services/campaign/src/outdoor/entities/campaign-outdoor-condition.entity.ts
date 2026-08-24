// ============================================================
// VoteCapsule™ — Campaign Outdoor Condition Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { CampaignOutdoorPlacement } from './campaign-outdoor-placement.entity';

@Entity('campaign_outdoor_conditions')
export class CampaignOutdoorCondition {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_coc_placement')
  @Column({ type: 'uuid', name: 'placement_id' }) placementId: string;

  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'uuid', name: 'inspected_by' }) inspectedBy: string;
  @Column({ type: 'varchar', length: 20 }) condition: string;
  @Column({ type: 'uuid', name: 'photo_media_id', nullable: true }) photoMediaId: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lng: number | null;
  @Column({ type: 'text', name: 'action_required', nullable: true }) actionRequired: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'timestamptz', name: 'inspected_at', default: () => 'NOW()' }) inspectedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => CampaignOutdoorPlacement, (p) => p.conditions)
  @JoinColumn({ name: 'placement_id' })
  placement: CampaignOutdoorPlacement;
}
