import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Campaign } from '../../campaign/entities/campaign.entity';

@Entity('campaign_volunteers')
export class CampaignVolunteer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 100, name: 'first_name' }) firstName: string;
  @Column({ type: 'varchar', length: 100, name: 'last_name' }) lastName: string;
  @Column({ type: 'varchar', length: 20 }) phone: string;
  @Column({ type: 'varchar', length: 200, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 30, name: 'national_id', nullable: true }) nationalId: string | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'uuid', name: 'assigned_coordinator_id', nullable: true }) assignedCoordinatorId: string | null;
  @Column({ type: 'simple-array', nullable: true }) skills: string[];
  @Column({ type: 'jsonb', default: '{}' }) availability: Record<string, unknown>;
  @Column({ type: 'varchar', length: 30, name: 'training_status', default: 'not_trained' }) trainingStatus: string;
  @Column({ type: 'timestamptz', name: 'training_completed_at', nullable: true }) trainingCompletedAt: Date | null;
  @Column({ type: 'int', name: 'events_attended', default: 0 }) eventsAttended: number;
  @Column({ type: 'int', name: 'tasks_completed', default: 0 }) tasksCompleted: number;
  @Column({ type: 'boolean', name: 'consent_given', default: false }) consentGiven: boolean;
  @Column({ type: 'date', name: 'consent_date', nullable: true }) consentDate: Date | null;
  @Column({ type: 'varchar', length: 50, name: 'consent_method', nullable: true }) consentMethod: string | null;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'registered_by', nullable: true }) registeredBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => Campaign, (c) => c.volunteers) @JoinColumn({ name: 'campaign_id' }) campaign: Campaign;
}
