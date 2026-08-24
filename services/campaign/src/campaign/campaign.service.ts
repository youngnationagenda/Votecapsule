// ============================================================
// VoteCapsule™ — Campaign Service
// ============================================================
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
  ) {}

  async create(dto: CreateCampaignDto, tenantId: string, userId: string): Promise<Campaign> {
    const entity = this.repo.create({ ...dto, tenantId, createdBy: userId });
    const saved = await this.repo.save(entity);
    this.logger.log(`Campaign created: ${saved.id} for tenant ${tenantId}`);
    return saved;
  }

  async findAll(tenantId: string, candidateId?: string, electionId?: string): Promise<Campaign[]> {
    const where: FindOptionsWhere<Campaign> = { tenantId };
    if (candidateId) where.candidateId = candidateId;
    if (electionId)  where.electionId  = electionId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Campaign> {
    const c = await this.repo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException(`Campaign ${id} not found`);
    return c;
  }

  async update(id: string, dto: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    const c = await this.findOne(id, tenantId);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async updateStatus(id: string, status: CampaignStatus, tenantId: string): Promise<Campaign> {
    const c = await this.findOne(id, tenantId);
    c.status = status;
    return this.repo.save(c);
  }

  async getDashboard(id: string, tenantId: string): Promise<Record<string, unknown>> {
    const campaign = await this.findOne(id, tenantId);
    return {
      campaign,
      summary: {
        status: campaign.status,
        targetWards: campaign.targetWards?.length ?? 0,
      },
    };
  }
}
