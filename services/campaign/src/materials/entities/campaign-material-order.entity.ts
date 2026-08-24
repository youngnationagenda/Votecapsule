// ============================================================
// VoteCapsule™ — Campaign Material Order Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { CampaignMaterialType } from './campaign-material-type.entity';
import { CampaignSupplier } from './campaign-supplier.entity';

@Entity('campaign_material_orders')
export class CampaignMaterialOrder {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cmo_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Index('idx_cmo_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'varchar', length: 30, name: 'order_number', unique: true }) orderNumber: string;

  @Index('idx_cmo_type')
  @Column({ type: 'uuid', name: 'material_type_id' }) materialTypeId: string;

  @Column({ type: 'int' }) quantity: number;
  @Column({ type: 'varchar', length: 20, name: 'size_code', nullable: true }) sizeCode: string | null;
  @Column({ type: 'uuid', name: 'design_request_id', nullable: true }) designRequestId: string | null;
  @Column({ type: 'text', name: 'design_notes', nullable: true }) designNotes: string | null;
  @Column({ type: 'uuid', name: 'supplier_id', nullable: true }) supplierId: string | null;

  @Index('idx_cmo_status')
  @Column({ type: 'varchar', length: 30, name: 'production_status', default: 'draft' }) productionStatus: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_cost', nullable: true }) unitCost: number | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_cost', nullable: true }) totalCost: number | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'amount_paid', default: 0 }) amountPaid: number;
  @Column({ type: 'varchar', length: 20, name: 'payment_status', default: 'unpaid' }) paymentStatus: string;
  @Column({ type: 'char', length: 3, name: 'target_county_code', nullable: true }) targetCountyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'target_constituency_code', nullable: true }) targetConstituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'target_ward_code', nullable: true }) targetWardCode: string | null;
  @Column({ type: 'uuid', name: 'requested_by' }) requestedBy: string;
  @Column({ type: 'uuid', name: 'approved_by', nullable: true }) approvedBy: string | null;
  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true }) approvedAt: Date | null;
  @Column({ type: 'text', name: 'approval_notes', nullable: true }) approvalNotes: string | null;
  @Column({ type: 'date', name: 'ordered_date', nullable: true }) orderedDate: Date | null;
  @Column({ type: 'date', name: 'expected_delivery', nullable: true }) expectedDelivery: Date | null;
  @Column({ type: 'date', name: 'actual_delivery', nullable: true }) actualDelivery: Date | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignMaterialType)
  @JoinColumn({ name: 'material_type_id' })
  materialType: CampaignMaterialType;

  @ManyToOne(() => CampaignSupplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: CampaignSupplier | null;
}
