// ============================================================
// VoteCapsule™ — Campaign Event Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Campaign } from '../../campaign/entities/campaign.entity';
import { CampaignEventCapsule } from './campaign-event-capsule.entity';

export enum EventType {
  RALLY           = 'RALLY',
  MEETING         = 'MEETING',
  DOOR_TO_DOOR    = 'DOOR_TO_DOOR',
  PRESS_CONFERENCE = 'PRESS_CONFERENCE',
  DEBATE          = 'DEBATE',
  FUNDRAISER      = 'FUNDRAISER',
  OTHER           = 'OTHER',
}

export enum EventStatus {
  SCHEDULED   = 'scheduled',
  CONFIRMED   = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED   = 'completed',
  CANCELLED   = 'cancelled',
  POSTPONED   = 'postponed',
}

@Entity('campaign_events')
@Index('idx_ce_start_time', ['startTime'])
@Index('idx_ce_ward', ['wardCode'])
export class CampaignEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 300, name: 'event_name' }) eventName: string;
  @Column({ type: 'varchar', length: 50, name: 'event_type' }) eventType: EventType;
  @Column({ type: 'varchar', length: 50, name: 'event_category', default: 'CAMPAIGN' }) eventCategory: string;
  @Column({ type: 'timestamptz', name: 'start_time' }) startTime: Date;
  @Column({ type: 'timestamptz', name: 'end_time' }) endTime: Date;
  @Column({ type: 'varchar', length: 300, name: 'venue_name', nullable: true }) venueName: string | null;
  @Column({ type: 'text', name: 'venue_address', nullable: true }) venueAddress: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lng: number | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'uuid', name: 'ward_id', nullable: true }) wardId: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'int', name: 'expected_attendance', default: 0 }) expectedAttendance: number;
  @Column({ type: 'int', name: 'actual_attendance', nullable: true }) actualAttendance: number | null;
  @Column({ type: 'uuid', name: 'coordinator_id', nullable: true }) coordinatorId: string | null;
  @Column({ type: 'boolean', name: 'requires_security', default: false }) requiresSecurity: boolean;
  @Column({ type: 'boolean', name: 'requires_transport', default: false }) requiresTransport: boolean;
  @Column({ type: 'boolean', name: 'requires_pa_system', default: false }) requiresPaSystem: boolean;
  @Column({ type: 'boolean', name: 'requires_stage', default: false }) requiresStage: boolean;
  @Column({ type: 'boolean', name: 'requires_tents', default: false }) requiresTents: boolean;
  @Column({ type: 'boolean', name: 'requires_chairs', default: false }) requiresChairs: boolean;
  @Column({ type: 'boolean', name: 'permit_required', default: false }) permitRequired: boolean;
  @Column({ type: 'varchar', length: 100, name: 'permit_number', nullable: true }) permitNumber: string | null;
  @Column({ type: 'date', name: 'permit_issued_date', nullable: true }) permitIssuedDate: Date | null;
  @Column({ type: 'varchar', length: 200, name: 'permit_authority', nullable: true }) permitAuthority: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'budget_estimate', default: 0 }) budgetEstimate: number;
  @Column({ type: 'varchar', length: 30, default: EventStatus.SCHEDULED }) status: EventStatus;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => Campaign, (c) => c.events)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @OneToMany(() => CampaignEventCapsule, (cap) => cap.event)
  capsules: CampaignEventCapsule[];
}
