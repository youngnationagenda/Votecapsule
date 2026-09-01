import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaign_bank_accounts')
export class CampaignBankAccount {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id', unique: true }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' })   tenantId: string;
  @Column({ type: 'varchar', length: 200, name: 'bank_name' }) bankName: string;
  @Column({ type: 'varchar', length: 200, name: 'branch_name', nullable: true }) branchName: string | null;
  @Column({ type: 'varchar', length: 50, name: 'account_number' }) accountNumber: string;
  @Column({ type: 'char', length: 3, default: 'KES' }) currency: string;
  @Column({ type: 'jsonb', default: '[]' }) signatories: string[];
  @Column({ type: 'boolean', default: false }) registered: boolean;
  @Column({ type: 'date', name: 'registered_date', nullable: true }) registeredDate: Date | null;
  @Column({ type: 'boolean', name: 'iebc_notified', default: false }) iebcNotified: boolean;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
