// ============================================================
// VoteCapsule™ — Campaign Supplier Product Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { CampaignSupplier } from './campaign-supplier.entity';

@Entity('campaign_supplier_products')
@Unique(['supplierId', 'materialTypeId'])
export class CampaignSupplierProduct {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_csp_supplier')
  @Column({ type: 'uuid', name: 'supplier_id' }) supplierId: string;

  @Index('idx_csp_material')
  @Column({ type: 'uuid', name: 'material_type_id', nullable: true }) materialTypeId: string | null;

  @Column({ type: 'varchar', length: 500, name: 'supplier_product_name' }) supplierProductName: string;
  @Column({ type: 'varchar', length: 100, name: 'supplier_sku', nullable: true }) supplierSku: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price', nullable: true }) unitPrice: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'bulk_price', nullable: true }) bulkPrice: number | null;
  @Column({ type: 'int', name: 'bulk_min_quantity', nullable: true }) bulkMinQuantity: number | null;
  @Column({ type: 'char', length: 3, default: 'KES' }) currency: string;
  @Column({ type: 'varchar', length: 1000, name: 'product_url', nullable: true }) productUrl: string | null;
  @Column({ type: 'varchar', length: 1000, name: 'image_url', nullable: true }) imageUrl: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'jsonb', default: '{}' }) specifications: Record<string, unknown>;

  @Index('idx_csp_available')
  @Column({ type: 'boolean', name: 'is_available', default: true }) isAvailable: boolean;

  @Column({ type: 'smallint', name: 'lead_time_days', default: 14 }) leadTimeDays: number;
  @Column({ type: 'jsonb', default: '{}' }) metadata: Record<string, unknown>;
  @Column({ type: 'timestamptz', name: 'scraped_at', nullable: true }) scrapedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignSupplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: CampaignSupplier;
}
