// ============================================================
// VoteCapsule™ — Campaign Event Capsule Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { CampaignEvent } from './campaign-event.entity';

@Entity('campaign_event_capsules')
export class CampaignEventCapsule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'event_id' }) eventId: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'uuid', name: 'submitted_by' }) submittedBy: string;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'submission_lat', nullable: true }) submissionLat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'submission_lng', nullable: true }) submissionLng: number | null;
  @Column({ type: 'int', name: 'gps_distance_metres', nullable: true }) gpsDistanceMetres: number | null;
  @Column({ type: 'boolean', name: 'gps_verified', default: false }) gpsVerified: boolean;
  @Column({ type: 'boolean', name: 'gps_flag', default: false }) gpsFlag: boolean;
  @Column({ type: 'int', name: 'attendance_count', default: 0 }) attendanceCount: number;
  @Column({ type: 'text', name: 'attendance_notes', nullable: true }) attendanceNotes: string | null;
  @Column({ type: 'jsonb', name: 'expenditure_breakdown', default: '{}' }) expenditureBreakdown: Record<string, number>;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_expenditure', default: 0 }) totalExpenditure: number;
  @Column({ type: 'jsonb', name: 'materials_used', default: '[]' }) materialsUsed: unknown[];
  @Column({ type: 'simple-array', name: 'photo_media_ids', nullable: true }) photoMediaIds: string[];
  @Column({ type: 'simple-array', name: 'video_media_ids', nullable: true }) videoMediaIds: string[];
  @Column({ type: 'varchar', length: 30, name: 'verification_status', default: 'pending' }) verificationStatus: string;
  @Column({ type: 'uuid', name: 'reviewed_by', nullable: true }) reviewedBy: string | null;
  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true }) reviewedAt: Date | null;
  @Column({ type: 'text', name: 'review_notes', nullable: true }) reviewNotes: string | null;
  @Column({ type: 'timestamptz', name: 'submitted_at', default: () => 'NOW()' }) submittedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignEvent, (e) => e.capsules)
  @JoinColumn({ name: 'event_id' })
  event: CampaignEvent;
}
