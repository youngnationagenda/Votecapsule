// ============================================================
// VoteCapsule™ — Campaign Material Distribution Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_material_distributions')
export class CampaignMaterialDistribution {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cmd_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Index('idx_cmd_type')
  @Column({ type: 'uuid', name: 'material_type_id' }) materialTypeId: string;

  @Column({ type: 'uuid', name: 'inventory_id', nullable: true }) inventoryId: string | null;
  @Column({ type: 'int' }) quantity: number;
  @Column({ type: 'char', length: 3, name: 'from_county_code', nullable: true }) fromCountyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'from_constituency_code', nullable: true }) fromConstituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'from_ward_code', nullable: true }) fromWardCode: string | null;
  @Column({ type: 'char', length: 3, name: 'to_county_code', nullable: true }) toCountyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'to_constituency_code', nullable: true }) toConstituencyCode: string | null;

  @Index('idx_cmd_ward')
  @Column({ type: 'char', length: 4, name: 'to_ward_code', nullable: true }) toWardCode: string | null;

  @Column({ type: 'varchar', length: 200, name: 'recipient_name', nullable: true }) recipientName: string | null;
  @Column({ type: 'uuid', name: 'recipient_id', nullable: true }) recipientId: string | null;
  @Column({ type: 'uuid', name: 'evidence_media_id', nullable: true }) evidenceMediaId: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lng: number | null;
  @Column({ type: 'boolean', name: 'qr_scanned', default: false }) qrScanned: boolean;
  @Column({ type: 'varchar', length: 200, name: 'qr_code', nullable: true }) qrCode: string | null;
  @Column({ type: 'varchar', length: 20, default: 'completed' }) status: string;
  @Column({ type: 'uuid', name: 'distributed_by' }) distributedBy: string;
  @Column({ type: 'timestamptz', name: 'distributed_at', default: () => 'NOW()' }) distributedAt: Date;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
