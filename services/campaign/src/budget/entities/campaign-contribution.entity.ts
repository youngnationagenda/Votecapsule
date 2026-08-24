import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaign_contributions')
export class CampaignContribution {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'budget_id', nullable: true }) budgetId: string | null;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 300, name: 'contributor_name' }) contributorName: string;
  @Column({ type: 'varchar', length: 30, name: 'contributor_type', default: 'individual' }) contributorType: string;
  @Column({ type: 'varchar', length: 20, name: 'contributor_id_type', nullable: true }) contributorIdType: string | null;
  @Column({ type: 'varchar', length: 50, name: 'contributor_id_no', nullable: true }) contributorIdNo: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) amount: number;
  @Column({ type: 'text', name: 'in_kind_description', nullable: true }) inKindDescription: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'in_kind_value', nullable: true }) inKindValue: number | null;
  @Column({ type: 'varchar', length: 20, name: 'contribution_type', default: 'cash' }) contributionType: string;
  @Column({ type: 'varchar', length: 100, name: 'mpesa_ref', nullable: true }) mpesaRef: string | null;
  @Column({ type: 'varchar', length: 100, name: 'bank_ref', nullable: true }) bankRef: string | null;
  @Column({ type: 'varchar', length: 100, name: 'receipt_number', nullable: true }) receiptNumber: string | null;
  @Column({ type: 'date', name: 'contribution_date', default: () => 'CURRENT_DATE' }) contributionDate: Date;
  @Column({ type: 'varchar', length: 20, name: 'iebc_declaration_status', default: 'pending' }) iebcDeclarationStatus: string;
  @Column({ type: 'timestamptz', name: 'iebc_declared_at', nullable: true }) iebcDeclaredAt: Date | null;
  @Column({ type: 'uuid', name: 'recorded_by' }) recordedBy: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
