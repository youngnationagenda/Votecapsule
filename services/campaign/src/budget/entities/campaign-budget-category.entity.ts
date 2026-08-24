import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CampaignBudget } from './campaign-budget.entity';

@Entity('campaign_budget_categories')
export class CampaignBudgetCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'budget_id' }) budgetId: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 50, name: 'category_code' }) categoryCode: string;
  @Column({ type: 'varchar', length: 100, name: 'category_name' }) categoryName: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) allocated: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) committed: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) spent: number;
  @Column({ type: 'smallint', name: 'alert_threshold_pct', default: 80 }) alertThresholdPct: number;
  @Column({ type: 'boolean', name: 'alert_sent_80', default: false }) alertSent80: boolean;
  @Column({ type: 'boolean', name: 'alert_sent_95', default: false }) alertSent95: boolean;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignBudget, (b) => b.categories) @JoinColumn({ name: 'budget_id' }) budget: CampaignBudget;
}
