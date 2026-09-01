import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('campaign_authorized_persons')
@Index('idx_cap_campaign', ['campaignId'])
@Index('idx_cap_tenant',   ['tenantId'])
export class CampaignAuthorizedPerson {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' })   tenantId: string;
  @Column({ type: 'varchar', length: 300, name: 'full_name' }) fullName: string;
  @Column({ type: 'varchar', length: 50,  name: 'id_number'  }) idNumber: string;
  @Column({ type: 'varchar', length: 20,  name: 'pin_number', nullable: true }) pinNumber: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 30,  nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 10,  nullable: true }) gender: string | null;
  @Column({ type: 'text', name: 'postal_address', nullable: true }) postalAddress: string | null;
  @Column({ type: 'varchar', length: 30, default: 'agent' }) role: string;
  @Column({ type: 'varchar', length: 20, name: 'committee_position', nullable: true }) committeePosition: string | null;
  @Column({ type: 'date', name: 'date_appointed' }) dateAppointed: Date;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;
  @Column({ type: 'varchar', length: 20, name: 'ecf_form_ref', default: 'ECF 1' }) ecfFormRef: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
