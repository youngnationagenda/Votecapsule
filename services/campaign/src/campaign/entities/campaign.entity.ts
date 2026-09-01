// ============================================================
// VoteCapsule™ — Campaign Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { CampaignEvent }    from '../../events/entities/campaign-event.entity';
import { CampaignTask }     from '../../tasks/entities/campaign-task.entity';
import { CampaignTeam }     from '../../teams/entities/campaign-team.entity';
import { CampaignVolunteer } from '../../teams/entities/campaign-volunteer.entity';

export enum CampaignStatus {
  CREATED   = 'created',
  PLANNING  = 'planning',
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  CLOSED    = 'closed',
  AUDITED   = 'audited',
  ARCHIVED  = 'archived',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'uuid', name: 'candidate_id', nullable: true }) candidateId: string | null;
  @Column({ type: 'uuid', name: 'election_id' }) electionId: string;
  @Column({ type: 'uuid', name: 'party_id', nullable: true }) partyId: string | null;
  @Column({ type: 'varchar', length: 300 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 30, default: CampaignStatus.CREATED }) status: CampaignStatus;
  @Column({ type: 'date', name: 'campaign_start_date', nullable: true }) campaignStartDate: Date | null;
  @Column({ type: 'date', name: 'campaign_end_date', nullable: true }) campaignEndDate: Date | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) headquarters: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'headquarters_lat', nullable: true }) headquartersLat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'headquarters_lng', nullable: true }) headquartersLng: number | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'jsonb', name: 'target_wards', default: '[]' }) targetWards: string[];
  @Column({ type: 'jsonb', default: '{}' }) goals: Record<string, unknown>;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToMany(() => CampaignEvent, (e) => e.campaign) events: CampaignEvent[];
  @OneToMany(() => CampaignTask, (t) => t.campaign) tasks: CampaignTask[];
  @OneToMany(() => CampaignTeam, (t) => t.campaign) teams: CampaignTeam[];
  @OneToMany(() => CampaignVolunteer, (v) => v.campaign) volunteers: CampaignVolunteer[];
}
