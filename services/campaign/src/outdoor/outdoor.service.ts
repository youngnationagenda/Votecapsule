// ============================================================
// VoteCapsule™ — Outdoor Advertising Service
// B2 FIX: Auto-resolve ward/constituency/county from GPS via Geography Service
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CampaignOutdoorPlacement } from './entities/campaign-outdoor-placement.entity';
import { CampaignOutdoorCondition } from './entities/campaign-outdoor-condition.entity';

@Injectable()
export class OutdoorService {
  private readonly logger = new Logger(OutdoorService.name);
  private readonly geographyServiceUrl: string;

  constructor(
    @InjectRepository(CampaignOutdoorPlacement)
    private readonly placementRepo: Repository<CampaignOutdoorPlacement>,
    @InjectRepository(CampaignOutdoorCondition)
    private readonly conditionRepo: Repository<CampaignOutdoorCondition>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.geographyServiceUrl = this.config.get<string>(
      'GEOGRAPHY_SERVICE_URL',
      'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com/api/v1/geography',
    );
  }

  /**
   * Auto-resolve ward_code, constituency_code, county_code from GPS coordinates.
   * Calls the Geography Service /wards/by-coordinates endpoint.
   * Falls back gracefully — placement is still created if geo service unavailable.
   */
  private async resolveGeography(lat: number, lng: number): Promise<{
    wardCode?: string;
    constituencyCode?: string;
    countyCode?: string;
  }> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.geographyServiceUrl}/wards/by-coordinates`, {
          params: { lat, lng },
          timeout: 3000,
        }),
      );
      const d = data?.data ?? data ?? {};
      return {
        wardCode:         d.wardCode         ?? d.ward_code         ?? undefined,
        constituencyCode: d.constituencyCode  ?? d.constituency_code ?? undefined,
        countyCode:       d.countyCode        ?? d.county_code       ?? undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Geography resolution failed for (${lat},${lng}): ${msg}`);
      return {};
    }
  }

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

    // Auto-resolve geography codes from lat/lng — use any already-provided codes as fallback
    const resolved = await this.resolveGeography(Number(dto.lat), Number(dto.lng));

    const entity = this.placementRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy:        userId,
      status:           'active',
      wardCode:         resolved.wardCode         ?? dto.wardCode         ?? null,
      constituencyCode: resolved.constituencyCode ?? dto.constituencyCode ?? null,
      countyCode:       resolved.countyCode       ?? dto.countyCode       ?? null,
    });
    const saved = await this.placementRepo.save(entity) as unknown as CampaignOutdoorPlacement;
    this.logger.log(
      `Outdoor placement created: ${saved.id} ` +
      `ward=${resolved.wardCode ?? 'unknown'} constituency=${resolved.constituencyCode ?? 'unknown'}`,
    );
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

    if (filters?.wardCode) qb.andWhere('p.ward_code = :ward',     { ward: filters.wardCode });
    if (filters?.type)     qb.andWhere('p.placement_type = :type', { type: filters.type });
    if (filters?.status)   qb.andWhere('p.status = :status',       { status: filters.status });

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
    return this.placementRepo
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
  }
}
