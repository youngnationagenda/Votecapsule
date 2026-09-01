import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('campaign_supporting_orgs')
@Index('idx_cso_campaign', ['campaignId'])
export class CampaignSupportingOrg {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' })  campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' })    tenantId: string;
  @Column({ type: 'varchar', length: 300, name: 'org_name' }) orgName: string;
  @Column({ type: 'varchar', length: 200, name: 'contact_person', nullable: true }) contactPerson: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 30,  nullable: true }) phone: string | null;
  @Column({ type: 'text', name: 'postal_address', nullable: true }) postalAddress: string | null;
  @Column({ type: 'varchar', length: 20, name: 'consent_status', default: 'pending' }) consentStatus: string;
  @Column({ type: 'date', name: 'consent_date', nullable: true }) consentDate: Date | null;
  @Column({ type: 'varchar', length: 100, name: 'consent_letter_ref', nullable: true }) consentLetterRef: string | null;
  @Column({ type: 'boolean', name: 'iebc_notified', default: false }) iebcNotified: boolean;
  @Column({ type: 'varchar', length: 20, name: 'ecf_form_ref', default: 'ECF 3' }) ecfFormRef: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
