// ============================================================
// VoteCapsule™ — Outdoor Advertising Service
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CampaignOutdoorPlacement } from './entities/campaign-outdoor-placement.entity';
import { CampaignOutdoorCondition } from './entities/campaign-outdoor-condition.entity';

@Injectable()
export class OutdoorService {
  private readonly logger = new Logger(OutdoorService.name);

  constructor(
    @InjectRepository(CampaignOutdoorPlacement)
    private readonly placementRepo: Repository<CampaignOutdoorPlacement>,
    @InjectRepository(CampaignOutdoorCondition)
    private readonly conditionRepo: Repository<CampaignOutdoorCondition>,
  ) {}

  // ── Placements ────────────────────────────────────────────────

  async create(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignOutdoorPlacement> {
    if (!dto.lat || !dto.lng) {
      throw new Error('GPS coordinates (lat/lng) are required for outdoor placements');
    }
    const entity = this.placementRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      status:    'active',
    });
    const saved = await this.placementRepo.save(entity) as unknown as CampaignOutdoorPlacement;
    this.logger.log(`Outdoor placement created: ${saved.id} for campaign ${campaignId}`);
    return saved;
  }

  async findAll(
    campaignId: string,
    tenantId: string,
    filters?: { wardCode?: string; type?: string; status?: string },
  ): Promise<CampaignOutdoorPlacement[]> {
    const qb = this.placementRepo.createQueryBuilder('p')
      .where('p.campaign_id = :campaignId', { campaignId })
      .andWhere('p.tenant_id = :tenantId', { tenantId });

    if (filters?.wardCode)    qb.andWhere('p.ward_code = :ward', { ward: filters.wardCode });
    if (filters?.type)        qb.andWhere('p.placement_type = :type', { type: filters.type });
    if (filters?.status)      qb.andWhere('p.status = :status', { status: filters.status });

    return qb.orderBy('p.created_at', 'DESC').getMany();
  }

  async findOne(
    id: string,
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignOutdoorPlacement> {
    const p = await this.placementRepo.findOne({
      where:    { id, campaignId, tenantId },
      relations: ['conditions'],
    });
    if (!p) throw new NotFoundException(`Placement ${id} not found`);
    return p;
  }

  async update(
    id: string,
    campaignId: string,
    dto: any,
    tenantId: string,
  ): Promise<CampaignOutdoorPlacement> {
    const p = await this.findOne(id, campaignId, tenantId);
    Object.assign(p, dto);
    return this.placementRepo.save(p);
  }

  // ── Condition Reports ─────────────────────────────────────────

  async reportCondition(
    placementId: string,
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignOutdoorCondition> {
    const placement = await this.findOne(placementId, campaignId, tenantId);

    // Update current condition on placement
    placement.currentCondition = dto.condition;
    if (dto.condition === 'removed') placement.status = 'removed';
    await this.placementRepo.save(placement);

    const cond = this.conditionRepo.create({
      ...dto,
      placementId,
      campaignId,
      tenantId,
      inspectedBy: userId,
    });
    return this.conditionRepo.save(cond) as unknown as Promise<CampaignOutdoorCondition>;
  }

  // ── Coverage Stats ────────────────────────────────────────────

  async getCoverage(
    campaignId: string,
    tenantId: string,
  ): Promise<Record<string, unknown>[]> {
    const rows = await this.placementRepo
      .createQueryBuilder('p')
      .select('p.ward_code', 'wardCode')
      .addSelect('p.constituency_code', 'constituencyCode')
      .addSelect(`COUNT(*) FILTER (WHERE p.status = 'active')`, 'active')
      .addSelect(`COUNT(*) FILTER (WHERE p.current_condition = 'damaged')`, 'damaged')
      .addSelect(`COUNT(*) FILTER (WHERE p.status = 'removed')`, 'removed')
      .addSelect('COUNT(*)', 'total')
      .where('p.campaign_id = :campaignId', { campaignId })
      .andWhere('p.tenant_id = :tenantId', { tenantId })
      .groupBy('p.ward_code, p.constituency_code')
      .orderBy('p.ward_code', 'ASC')
      .getRawMany();

    return rows;
  }
}
