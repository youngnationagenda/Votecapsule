import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CampaignBudgetCategory } from './campaign-budget-category.entity';
import { CampaignExpense } from './campaign-expense.entity';

@Entity('campaign_budgets')
export class CampaignBudget {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_allocated', default: 0 }) totalAllocated: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_committed', default: 0 }) totalCommitted: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_spent', default: 0 }) totalSpent: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'iebc_spending_limit', nullable: true }) iebcSpendingLimit: number | null;
  @Column({ type: 'char', length: 3, default: 'KES' }) currency: string;
  @Column({ type: 'smallint', name: 'fiscal_year', nullable: true }) fiscalYear: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToMany(() => CampaignBudgetCategory, (c) => c.budget) categories: CampaignBudgetCategory[];
  @OneToMany(() => CampaignExpense, (e) => e.budget) expenses: CampaignExpense[];
}
