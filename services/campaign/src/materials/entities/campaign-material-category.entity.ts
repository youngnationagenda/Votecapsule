// ============================================================
// VoteCapsule™ — Campaign Material Category Entity
// ============================================================
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { CampaignMaterialType } from './campaign-material-type.entity';

@Entity('campaign_material_categories')
export class CampaignMaterialCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 50, unique: true }) code: string;
  @Column({ type: 'varchar', length: 150 }) name: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) icon: string | null;
  @Column({ type: 'smallint', name: 'sort_order', default: 0 }) sortOrder: number;
  @Column({ type: 'varchar', length: 1000, name: 'thumbnail_url', nullable: true }) thumbnailUrl: string | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @OneToMany(() => CampaignMaterialType, (t) => t.category) types: CampaignMaterialType[];
}
