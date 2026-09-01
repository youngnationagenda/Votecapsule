// ============================================================
// VoteCapsule™ — Campaign Compliance Document Entity
// Stores uploaded IEBC compliance documents (Form ECF 1-8)
// Migration 170
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_compliance_documents')
@Index('idx_ccd_campaign', ['campaignId'])
@Index('idx_ccd_tenant',   ['tenantId'])
@Index('idx_ccd_status',   ['status'])
export class CampaignComplianceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  @Index()
  campaignId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'doc_code', length: 50 })
  docCode: string;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 's3_key', length: 500 })
  s3Key: string;

  @Column({ name: 'content_type', length: 100, nullable: true })
  contentType: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string | null;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'reviewer_notes', type: 'text', nullable: true })
  reviewerNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
