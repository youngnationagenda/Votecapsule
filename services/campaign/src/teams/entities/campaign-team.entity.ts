import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Campaign } from '../../campaign/entities/campaign.entity';
import { CampaignTeamMember } from './campaign-team-member.entity';

@Entity('campaign_teams')
export class CampaignTeam {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 200, name: 'team_name' }) teamName: string;
  @Column({ type: 'varchar', length: 50, name: 'team_type', default: 'GENERAL' }) teamType: string;
  @Column({ type: 'uuid', name: 'team_leader_id', nullable: true }) teamLeaderId: string | null;
  @Column({ type: 'varchar', length: 200, name: 'team_leader_name', nullable: true }) teamLeaderName: string | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => Campaign, (c) => c.teams) @JoinColumn({ name: 'campaign_id' }) campaign: Campaign;
  @OneToMany(() => CampaignTeamMember, (m) => m.team) members: CampaignTeamMember[];
}
