import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CampaignTeam } from './campaign-team.entity';

@Entity('campaign_team_members')
@Unique(['teamId', 'userId'])
export class CampaignTeamMember {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'varchar', length: 200, name: 'user_name', nullable: true }) userName: string | null;
  @Column({ type: 'varchar', length: 200, name: 'user_email', nullable: true }) userEmail: string | null;
  @Column({ type: 'varchar', length: 50, name: 'campaign_role', default: 'MEMBER' }) campaignRole: string;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;
  @Column({ type: 'timestamptz', name: 'joined_at', default: () => 'NOW()' }) joinedAt: Date;
  @Column({ type: 'timestamptz', name: 'left_at', nullable: true }) leftAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => CampaignTeam, (t) => t.members) @JoinColumn({ name: 'team_id' }) team: CampaignTeam;
}
