import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CampaignBudget } from './campaign-budget.entity';

@Entity('campaign_expenses')
export class CampaignExpense {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'budget_id', nullable: true }) budgetId: string | null;
  @Column({ type: 'uuid', name: 'category_id', nullable: true }) categoryId: string | null;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 500 }) description: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) amount: number;
  @Column({ type: 'date', name: 'expense_date', default: () => 'CURRENT_DATE' }) expenseDate: Date;
  @Column({ type: 'varchar', length: 30, name: 'source_type', nullable: true }) sourceType: string | null;
  @Column({ type: 'uuid', name: 'event_id', nullable: true }) eventId: string | null;
  @Column({ type: 'uuid', name: 'order_id', nullable: true }) orderId: string | null;
  @Column({ type: 'uuid', name: 'placement_id', nullable: true }) placementId: string | null;
  @Column({ type: 'uuid', name: 'trip_id', nullable: true }) tripId: string | null;
  @Column({ type: 'varchar', length: 30, name: 'payment_method', default: 'cash' }) paymentMethod: string;
  @Column({ type: 'varchar', length: 100, name: 'mpesa_ref', nullable: true }) mpesaRef: string | null;
  @Column({ type: 'varchar', length: 100, name: 'bank_ref', nullable: true }) bankRef: string | null;
  @Column({ type: 'uuid', name: 'receipt_media_id', nullable: true }) receiptMediaId: string | null;
  @Column({ type: 'boolean', name: 'iebc_reportable', default: true }) iebcReportable: boolean;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'uuid', name: 'recorded_by' }) recordedBy: string;
  @Column({ type: 'uuid', name: 'approved_by', nullable: true }) approvedBy: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignBudget, (b) => b.expenses) @JoinColumn({ name: 'budget_id' }) budget: CampaignBudget;
}
