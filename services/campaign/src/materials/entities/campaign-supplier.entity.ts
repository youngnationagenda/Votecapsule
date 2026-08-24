// ============================================================
// VoteCapsule™ — Campaign Supplier Entity
// ============================================================
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('campaign_suppliers')
export class CampaignSupplier {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cs_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'varchar', length: 300, name: 'company_name' }) companyName: string;
  @Column({ type: 'varchar', length: 200, name: 'contact_name', nullable: true }) contactName: string | null;
  @Column({ type: 'varchar', length: 20, name: 'contact_phone', nullable: true }) contactPhone: string | null;
  @Column({ type: 'varchar', length: 200, name: 'contact_email', nullable: true }) contactEmail: string | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ type: 'text', array: true, default: '{}' }) capabilities: string[];
  @Column({ type: 'smallint', name: 'lead_time_days', default: 7 }) leadTimeDays: number;
  @Column({ type: 'decimal', precision: 3, scale: 2, name: 'quality_rating', default: 0 }) qualityRating: number;
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'delivery_reliability', default: 0 }) deliveryReliability: number;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
