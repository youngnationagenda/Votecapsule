// ============================================================
// VoteCapsule™ — Campaign Design Request Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_design_requests')
export class CampaignDesignRequest {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cdr_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Index('idx_cdr_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'uuid', name: 'material_type_id' }) materialTypeId: string;
  @Column({ type: 'uuid', name: 'template_id', nullable: true }) templateId: string | null;
  @Column({ type: 'varchar', length: 500, name: 'candidate_photo_key', nullable: true }) candidatePhotoKey: string | null;
  @Column({ type: 'varchar', length: 300, name: 'candidate_name', nullable: true }) candidateName: string | null;
  @Column({ type: 'varchar', length: 500, name: 'candidate_slogan', nullable: true }) candidateSlogan: string | null;
  @Column({ type: 'uuid', name: 'party_id', nullable: true }) partyId: string | null;
  @Column({ type: 'char', length: 7, name: 'primary_colour', nullable: true }) primaryColour: string | null;
  @Column({ type: 'char', length: 7, name: 'secondary_colour', nullable: true }) secondaryColour: string | null;
  @Column({ type: 'jsonb', name: 'custom_text', default: '{}' }) customText: Record<string, unknown>;
  @Column({ type: 'varchar', length: 500, name: 'logo_key', nullable: true }) logoKey: string | null;
  @Column({ type: 'uuid', name: 'preview_media_id', nullable: true }) previewMediaId: string | null;
  @Column({ type: 'uuid', name: 'highres_media_id', nullable: true }) highresMediaId: string | null;
  @Column({ type: 'uuid', name: 'print_ready_media_id', nullable: true }) printReadyMediaId: string | null;
  @Column({ type: 'varchar', length: 20, name: 'approval_status', default: 'draft' }) approvalStatus: string;
  @Column({ type: 'uuid', name: 'approved_by', nullable: true }) approvedBy: string | null;
  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true }) approvedAt: Date | null;
  @Column({ type: 'text', name: 'rejection_reason', nullable: true }) rejectionReason: string | null;
  @Column({ type: 'uuid', name: 'parent_design_id', nullable: true }) parentDesignId: string | null;
  @Column({ type: 'smallint', default: 1 }) version: number;
  @Column({ type: 'uuid', name: 'requested_by' }) requestedBy: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
