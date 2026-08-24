// ============================================================
// VoteCapsule™ — Campaign Task Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Campaign } from '../../campaign/entities/campaign.entity';

export enum TaskPriority { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }
export enum TaskStatus   { TODO = 'todo', IN_PROGRESS = 'in_progress', BLOCKED = 'blocked', DONE = 'done', CANCELLED = 'cancelled' }

@Entity('campaign_tasks')
export class CampaignTask {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'event_id', nullable: true }) eventId: string | null;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 300 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 20, default: TaskPriority.MEDIUM }) priority: TaskPriority;
  @Column({ type: 'uuid', name: 'assigned_to', nullable: true }) assignedTo: string | null;
  @Column({ type: 'varchar', length: 200, name: 'assigned_to_name', nullable: true }) assignedToName: string | null;
  @Column({ type: 'timestamptz', name: 'due_date', nullable: true }) dueDate: Date | null;
  @Column({ type: 'varchar', length: 30, default: TaskStatus.TODO }) status: TaskStatus;
  @Column({ type: 'uuid', name: 'completion_evidence_media_id', nullable: true }) completionEvidenceMediaId: string | null;
  @Column({ type: 'text', name: 'completion_notes', nullable: true }) completionNotes: string | null;
  @Column({ type: 'simple-array', nullable: true }) dependencies: string[];
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true }) completedAt: Date | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => Campaign, (c) => c.tasks)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}
