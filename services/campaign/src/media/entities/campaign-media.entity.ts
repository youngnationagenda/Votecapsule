// ============================================================
// VoteCapsule™ — Campaign Media Entity
// Migration 165 adds: media_type, scan_status, exif_data,
//                     preview_key, public_key
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('campaign_media')
export class CampaignMedia {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cm_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Index('idx_cm_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  // ── Storage keys ─────────────────────────────────────────────
  @Column({ type: 'varchar', length: 500, name: 'storage_key'   }) storageKey:    string;
  @Column({ type: 'varchar', length: 500, name: 'thumbnail_key', nullable: true }) thumbnailKey:  string | null;
  @Column({ type: 'varchar', length: 500, name: 'preview_key',   nullable: true }) previewKey:    string | null;
  @Column({ type: 'varchar', length: 500, name: 'public_key',    nullable: true }) publicKey:     string | null;

  // ── File metadata ─────────────────────────────────────────────
  @Column({ type: 'varchar', length: 300, name: 'file_name'       }) fileName:      string;
  @Column({ type: 'bigint',               name: 'file_size_bytes', default: 0 }) fileSizeBytes: number;
  @Column({ type: 'varchar', length: 100, name: 'mime_type'        }) mimeType:      string;
  @Column({ type: 'int',                  name: 'width_px',  nullable: true }) widthPx:       number | null;
  @Column({ type: 'int',                  name: 'height_px', nullable: true }) heightPx:      number | null;
  @Column({ type: 'smallint',                                nullable: true }) dpi:           number | null;
  @Column({ type: 'int', name: 'duration_seconds',           nullable: true }) durationSeconds: number | null;

  // ── Media classification (migration 165) ─────────────────────
  @Index('idx_cm_media_type')
  @Column({ type: 'varchar', length: 30, name: 'media_type', nullable: true }) mediaType: string | null;

  // ── Associations ─────────────────────────────────────────────
  @Index('idx_cm_order')
  @Column({ type: 'uuid', name: 'order_id', nullable: true }) orderId: string | null;

  @Index('idx_cm_event')
  @Column({ type: 'uuid', name: 'event_id', nullable: true }) eventId: string | null;

  // ── Workflow status ───────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, name: 'approval_status',   default: 'pending' }) approvalStatus:   string;
  @Column({ type: 'varchar', length: 20, name: 'processing_status', default: 'pending' }) processingStatus: string;

  // ── Virus scan (migration 165) ────────────────────────────────
  // Values: pending | clean | infected | skipped
  @Column({ type: 'varchar', length: 20, name: 'scan_status', default: 'pending' }) scanStatus: string;

  // ── EXIF metadata (migration 165) ────────────────────────────
  // Populated by campaign-media-processor Lambda:
  // { gps: {lat, lng}, width, height, camera, iso, focalLength, takenAt, ... }
  @Column({ type: 'jsonb', name: 'exif_data', nullable: true }) exifData: Record<string, any> | null;

  // ── Versioning ────────────────────────────────────────────────
  @Column({ type: 'smallint',                      default: 1    }) version:       number;
  @Column({ type: 'uuid', name: 'parent_media_id', nullable: true }) parentMediaId: string | null;

  // ── User content ──────────────────────────────────────────────
  @Index('idx_cm_tags')
  @Column({ type: 'text', array: true, default: '{}' }) tags:        string[];
  @Column({ type: 'text',              nullable: true }) description: string | null;
  @Column({ type: 'uuid', name: 'uploaded_by'         }) uploadedBy:  string;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
