// ============================================================
// VoteCapsule™ — Campaign Material Type Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { CampaignMaterialCategory } from './campaign-material-category.entity';

@Entity('campaign_material_types')
export class CampaignMaterialType {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cmt_category')
  @Column({ type: 'uuid', name: 'category_id' }) categoryId: string;

  @Column({ type: 'varchar', length: 50, unique: true }) code: string;
  @Column({ type: 'varchar', length: 200 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 500, name: 'thumbnail_key', nullable: true }) thumbnailKey: string | null;
  @Column({ type: 'varchar', length: 500, name: 'preview_key', nullable: true }) previewKey: string | null;
  /** Full S3 URL — source of truth for catalogue images (thumbnail_key is legacy/unused) */
  @Column({ type: 'varchar', length: 1000, name: 'thumbnail_url', nullable: true }) thumbnailUrl: string | null;
  @Column({ type: 'jsonb', name: 'available_sizes', default: '[]' }) availableSizes: Record<string, unknown>[];
  @Column({ type: 'jsonb', default: '{}' }) specifications: Record<string, unknown>;
  @Column({ type: 'jsonb', name: 'branding_zones', default: '[]' }) brandingZones: Record<string, unknown>[];
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'typical_cost_min', nullable: true }) typicalCostMin: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'typical_cost_max', nullable: true }) typicalCostMax: number | null;
  @Column({ type: 'varchar', length: 30, default: 'piece' }) unit: string;
  @Column({ type: 'int', name: 'min_order_quantity', default: 1 }) minOrderQuantity: number;
  @Column({ type: 'smallint', name: 'lead_time_days', default: 7 }) leadTimeDays: number;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignMaterialCategory, (c) => c.types)
  @JoinColumn({ name: 'category_id' })
  category: CampaignMaterialCategory;
}
