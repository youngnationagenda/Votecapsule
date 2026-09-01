import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaign_compliance_certificates')
export class CampaignComplianceCertificate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id', unique: true }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' })    tenantId: string;
  @Column({ type: 'varchar', length: 20, default: 'pending' }) status: string;
  @Column({ type: 'date', name: 'issued_date', nullable: true }) issuedDate: Date | null;
  @Column({ type: 'varchar', length: 100, name: 'certificate_ref', nullable: true }) certificateRef: string | null;
  @Column({ type: 'varchar', length: 20, name: 'form_number', default: 'ECF 8' }) formNumber: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
