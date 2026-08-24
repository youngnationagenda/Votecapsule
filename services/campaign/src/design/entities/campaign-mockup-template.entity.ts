// ============================================================
// VoteCapsule™ — Campaign Mockup Template Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_mockup_templates')
export class CampaignMockupTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cmt_type')
  @Column({ type: 'uuid', name: 'material_type_id' }) materialTypeId: string;

  @Column({ type: 'varchar', length: 200, name: 'template_name' }) templateName: string;
  @Column({ type: 'varchar', length: 500, name: 'base_image_key' }) baseImageKey: string;
  @Column({ type: 'jsonb', default: '[]' }) zones: Record<string, unknown>[];
  @Column({ type: 'jsonb', name: 'colour_zones', default: '{}' }) colourZones: Record<string, unknown>;
  @Column({ type: 'varchar', length: 30, name: 'surface_type', default: 'flat' }) surfaceType: string;
  @Column({ type: 'int', name: 'canvas_width', default: 2480 }) canvasWidth: number;
  @Column({ type: 'int', name: 'canvas_height', default: 3508 }) canvasHeight: number;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
