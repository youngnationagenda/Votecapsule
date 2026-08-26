import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CampaignTeam }       from './entities/campaign-team.entity';
import { CampaignTeamMember } from './entities/campaign-team-member.entity';
import { CampaignVolunteer }  from './entities/campaign-volunteer.entity';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  private readonly identityServiceUrl: string;

  constructor(
    @InjectRepository(CampaignTeam) private readonly teamRepo: Repository<CampaignTeam>,
    @InjectRepository(CampaignTeamMember) private readonly memberRepo: Repository<CampaignTeamMember>,
    @InjectRepository(CampaignVolunteer) private readonly volunteerRepo: Repository<CampaignVolunteer>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.identityServiceUrl = this.config.get<string>(
      'IDENTITY_SERVICE_URL',
      'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com/api/v1/identity',
    );
  }

  // Teams
  async createTeam(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignTeam> {
    const entity = this.teamRepo.create({ ...dto, campaignId, tenantId, createdBy: userId }) as unknown as CampaignTeam;
    return this.teamRepo.save(entity);
  }

  async findTeams(campaignId: string, tenantId: string): Promise<CampaignTeam[]> {
    return this.teamRepo.find({ where: { campaignId, tenantId }, relations: ['members'], order: { createdAt: 'ASC' } });
  }

  async addMember(teamId: string, campaignId: string, dto: any, tenantId: string): Promise<CampaignTeamMember> {
    const team = await this.teamRepo.findOne({ where: { id: teamId, campaignId, tenantId } });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    try {
      const entity = this.memberRepo.create({ ...dto, teamId, campaignId, tenantId }) as unknown as CampaignTeamMember;
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
    const entity = this.volunteerRepo.create({ ...dto, campaignId, tenantId, registeredBy: userId }) as unknown as CampaignVolunteer;
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

  // ── Role assignment (uses campaign_team_members.campaign_role) ─

  async assignRole(
    campaignId: string,
    dto: { userId: string; role: string; userName?: string; userEmail?: string; wardCode?: string; constituencyCode?: string; countyCode?: string; candidateId?: string },
    tenantId: string,
  ): Promise<CampaignTeamMember> {
    // Find or create a member record for this user in this campaign
    let member = await this.memberRepo.findOne({ where: { userId: dto.userId, campaignId, tenantId } });
    if (member) {
      member.campaignRole = dto.role;
      if (dto.wardCode)          member.wardCode         = dto.wardCode;
      if (dto.constituencyCode)  member.constituencyCode = dto.constituencyCode;
      if (dto.countyCode)        member.countyCode       = dto.countyCode;
      member = await this.memberRepo.save(member);
    } else {
      // Find default team for this campaign (or use null teamId as placeholder)
      const team = await this.teamRepo.findOne({ where: { campaignId, tenantId } });
      const entity = this.memberRepo.create({
        teamId:           team?.id ?? '00000000-0000-0000-0000-000000000000',
        campaignId,
        tenantId,
        userId:           dto.userId,
        userName:         dto.userName         ?? null,
        userEmail:        dto.userEmail        ?? null,
        campaignRole:     dto.role,
        wardCode:         dto.wardCode         ?? null,
        constituencyCode: dto.constituencyCode ?? null,
        countyCode:       dto.countyCode       ?? null,
        status:           'active',
      }) as unknown as CampaignTeamMember;
      member = await this.memberRepo.save(entity);
    }

    // ── Sync role claims to Cognito via Identity Service ──────────
    // This ensures the Lambda authorizer forwards x-user-role on the
    // user's next request without waiting for a token refresh.
    await this.syncRoleToIdentity(dto.userId, {
      'custom:roles':           dto.role,
      'custom:wardCode':        dto.wardCode         ?? undefined,
      'custom:constituencyCode': dto.constituencyCode ?? undefined,
      'custom:candidateId':     dto.candidateId      ?? undefined,
    }, tenantId);

    return member;
  }

  /**
   * Sync role / geography claims to Cognito via Identity Service.
   * Fires and forgets — a failure here must never block the DB operation.
   */
  private async syncRoleToIdentity(
    userId: string,
    attrs: Record<string, string | undefined>,
    tenantId: string,
  ): Promise<void> {
    try {
      // Remove undefined values before sending
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(attrs)) {
        if (v !== undefined && v !== null) payload[k] = v;
      }
      if (Object.keys(payload).length === 0) return;

      await firstValueFrom(
        this.httpService.patch(
          `${this.identityServiceUrl}/users/${userId}/attributes`,
          payload,
          {
            headers: {
              'x-tenant-id':         tenantId,
              'x-internal-service':  'campaign',
              'Content-Type':        'application/json',
            },
            timeout: 5000,
          },
        ),
      );
      this.logger.log(`Synced Cognito attributes for user ${userId}: ${JSON.stringify(payload)}`);
    } catch (err: unknown) {
      // Log but never throw — role is already written to DB
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to sync Cognito attributes for user ${userId}: ${msg}`);
    }
  }

  async listRoles(
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignTeamMember[]> {
    return this.memberRepo.find({
      where: { campaignId, tenantId, status: 'active' },
      order: { createdAt: 'ASC' },
    });
  }

  async updateRole(
    campaignId: string,
    userId: string,
    dto: { role: string },
    tenantId: string,
  ): Promise<CampaignTeamMember> {
    const member = await this.memberRepo.findOne({ where: { userId, campaignId, tenantId } });
    if (!member) throw new NotFoundException(`User ${userId} not found in campaign`);
    member.campaignRole = dto.role;
    const saved = await this.memberRepo.save(member);

    // Sync updated role to Cognito
    await this.syncRoleToIdentity(userId, { 'custom:roles': dto.role }, tenantId);

    return saved;
  }

  async removeRole(
    campaignId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { userId, campaignId, tenantId } });
    if (!member) throw new NotFoundException(`User ${userId} not found in campaign`);
    member.status = 'inactive';
    member.leftAt = new Date();
    await this.memberRepo.save(member);
  }
}
