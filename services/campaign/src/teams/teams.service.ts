import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignTeam }       from './entities/campaign-team.entity';
import { CampaignTeamMember } from './entities/campaign-team-member.entity';
import { CampaignVolunteer }  from './entities/campaign-volunteer.entity';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(CampaignTeam) private readonly teamRepo: Repository<CampaignTeam>,
    @InjectRepository(CampaignTeamMember) private readonly memberRepo: Repository<CampaignTeamMember>,
    @InjectRepository(CampaignVolunteer) private readonly volunteerRepo: Repository<CampaignVolunteer>,
  ) {}

  // Teams
  async createTeam(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignTeam> {
    const entity = this.teamRepo.create({ ...dto, campaignId, tenantId, createdBy: userId });
    return this.teamRepo.save(entity);
  }

  async findTeams(campaignId: string, tenantId: string): Promise<CampaignTeam[]> {
    return this.teamRepo.find({ where: { campaignId, tenantId }, relations: ['members'], order: { createdAt: 'ASC' } });
  }

  async addMember(teamId: string, campaignId: string, dto: any, tenantId: string): Promise<CampaignTeamMember> {
    const team = await this.teamRepo.findOne({ where: { id: teamId, campaignId, tenantId } });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    try {
      const entity = this.memberRepo.create({ ...dto, teamId, campaignId, tenantId });
      return this.memberRepo.save(entity);
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('User already in this team');
      throw e;
    }
  }

  async removeMember(teamId: string, userId: string, campaignId: string, tenantId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { teamId, userId, campaignId, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    member.status = 'inactive';
    member.leftAt = new Date();
    await this.memberRepo.save(member);
  }

  // Volunteers
  async registerVolunteer(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignVolunteer> {
    const entity = this.volunteerRepo.create({ ...dto, campaignId, tenantId, registeredBy: userId });
    return this.volunteerRepo.save(entity);
  }

  async listVolunteers(campaignId: string, tenantId: string, filters?: { wardCode?: string; status?: string }): Promise<CampaignVolunteer[]> {
    const qb = this.volunteerRepo.createQueryBuilder('v')
      .where('v.campaign_id = :campaignId', { campaignId })
      .andWhere('v.tenant_id = :tenantId', { tenantId });
    if (filters?.wardCode) qb.andWhere('v.ward_code = :ward', { ward: filters.wardCode });
    if (filters?.status)   qb.andWhere('v.status = :status', { status: filters.status });
    return qb.orderBy('v.created_at', 'DESC').getMany();
  }

  async updateVolunteer(id: string, campaignId: string, dto: any, tenantId: string): Promise<CampaignVolunteer> {
    const v = await this.volunteerRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!v) throw new NotFoundException(`Volunteer ${id} not found`);
    Object.assign(v, dto);
    return this.volunteerRepo.save(v);
  }
}
