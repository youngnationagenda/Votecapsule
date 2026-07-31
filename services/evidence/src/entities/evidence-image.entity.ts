import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { EvidenceCapsule } from './evidence-capsule.entity';

export enum ImageType {
  FORM_FRONT       = 'FORM_FRONT',
  FORM_BACK        = 'FORM_BACK',
  SUPPLEMENTARY    = 'SUPPLEMENTARY',
  STAMP_CLOSEUP    = 'STAMP_CLOSEUP',
  SIGNATURE_CLOSEUP = 'SIGNATURE_CLOSEUP',
}

@Entity('evidence_images')
export class EvidenceImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'capsule_id', type: 'uuid' })
  capsuleId: string;

  @Column({ name: 'image_index', type: 'smallint', default: 0 })
  imageIndex: number;

  @Column({
    name: 'image_type', length: 30,
    default: ImageType.FORM_FRONT,
    enum: ImageType,
  })
  imageType: ImageType;

  @Column({ name: 'original_filename', length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: 'mime_type', length: 100, default: 'image/jpeg' })
  mimeType: string;

  @Column({ name: 'file_size_bytes' })
  fileSizeBytes: number;

  @Column({ name: 'width_px', nullable: true })
  widthPx: number | null;

  @Column({ name: 'height_px', nullable: true })
  heightPx: number | null;

  /** SHA-256 computed on device at capture time (offline-capable) */
  @Column({ name: 'sha256_hash', type: 'char', length: 64 })
  sha256Hash: string;

  @Column({ name: 'sha256_verified', default: false })
  sha256Verified: boolean;

  @Column({ name: 'sha256_verified_at', type: 'timestamptz', nullable: true })
  sha256VerifiedAt: Date | null;

  /** S3 storage */
  @Column({ name: 's3_bucket', length: 255 })
  s3Bucket: string;

  @Column({ name: 's3_key', length: 500, unique: true })
  s3Key: string;

  @Column({ name: 's3_region', length: 50, default: 'af-south-1' })
  s3Region: string;

  @Column({ name: 's3_object_locked', default: false })
  s3ObjectLocked: boolean;

  @Column({ name: 's3_object_locked_at', type: 'timestamptz', nullable: true })
  s3ObjectLockedAt: Date | null;

  @Column({ name: 's3_etag', length: 255, nullable: true })
  s3Etag: string | null;

  /** Image quality (set by AI service after upload) */
  @Column({ name: 'quality_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  qualityScore: number | null;

  @Column({ name: 'is_blurry', nullable: true })
  isBlurry: boolean | null;

  @Column({ name: 'is_overexposed', nullable: true })
  isOverexposed: boolean | null;

  @Column({ name: 'is_too_dark', nullable: true })
  isTooDark: boolean | null;

  @Column({ name: 'quality_notes', type: 'text', nullable: true })
  qualityNotes: string | null;

  @Column({ name: 'upload_status', length: 20, default: 'PENDING' })
  uploadStatus: string;

  @Column({ name: 'uploaded_at', type: 'timestamptz', nullable: true })
  uploadedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EvidenceCapsule, (c) => c.images)
  @JoinColumn({ name: 'capsule_id' })
  capsule: EvidenceCapsule;
}
