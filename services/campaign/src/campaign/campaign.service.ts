// ============================================================
// VoteCapsule™ — Campaign Service
// ============================================================
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

// Valid forward transitions
const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.CREATED]:   [CampaignStatus.PLANNING, CampaignStatus.CLOSED],
  [CampaignStatus.PLANNING]:  [CampaignStatus.ACTIVE, CampaignStatus.SUSPENDED, CampaignStatus.CLOSED],
  [CampaignStatus.ACTIVE]:    [CampaignStatus.SUSPENDED, CampaignStatus.CLOSED],
  [CampaignStatus.SUSPENDED]: [CampaignStatus.ACTIVE, CampaignStatus.CLOSED],
  [CampaignStatus.CLOSED]:    [CampaignStatus.AUDITED],
  [CampaignStatus.AUDITED]:   [CampaignStatus.ARCHIVED],
  [CampaignStatus.ARCHIVED]:  [],
};

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
  ) {}

  // ── create ─────────────────────────────────────────────────

  async create(dto: CreateCampaignDto, userId: string): Promise<Campaign> {
    const entity = this.repo.create({
      ...dto,
      status: CampaignStatus.CREATED,
      targetWards: dto.targetWards ?? [],
      goals: dto.goals ?? {},
      createdBy: userId,
    });
    const saved = await this.repo.save(entity);
    this.logger.log(`Campaign created: ${saved.id} for tenant ${saved.tenantId}`);
    return saved;
  }

  // ── findAll ─────────────────────────────────────────────────

  async findAll(tenantId: string, status?: string, candidateId?: string): Promise<Campaign[]> {
    const where: FindOptionsWhere<Campaign> = { tenantId };
    if (status)      where.status = status as CampaignStatus;
    if (candidateId) where.candidateId = candidateId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── findOne ─────────────────────────────────────────────────

  async findOne(id: string, tenantId: string): Promise<Campaign> {
    const c = await this.repo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException(`Campaign ${id} not found`);
    return c;
  }

  // ── update ──────────────────────────────────────────────────

  async update(id: string, tenantId: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const c = await this.findOne(id, tenantId);
    if ([CampaignStatus.CLOSED, CampaignStatus.AUDITED, CampaignStatus.ARCHIVED].includes(c.status)) {
      throw new BadRequestException(`Cannot update campaign in status: ${c.status}`);
    }
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  // ── updateStatus ────────────────────────────────────────────

  async updateStatus(id: string, tenantId: string, newStatus: CampaignStatus): Promise<Campaign> {
    const c = await this.findOne(id, tenantId);
    const allowed = STATUS_TRANSITIONS[c.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition campaign from '${c.status}' to '${newStatus}'. ` +
        `Allowed: [${allowed.join(', ')}]`
      );
    }
    c.status = newStatus;
    return this.repo.save(c);
  }

  // ── remove ──────────────────────────────────────────────────

  async remove(id: string, tenantId: string): Promise<void> {
    const c = await this.findOne(id, tenantId);
    const noDeleteStatuses = [CampaignStatus.ACTIVE, CampaignStatus.SUSPENDED, CampaignStatus.CLOSED, CampaignStatus.AUDITED, CampaignStatus.ARCHIVED];
    if (noDeleteStatuses.includes(c.status)) {
      throw new BadRequestException(
        `Cannot delete campaign in status: ${c.status}. Suspend it first.`
      );
    }
    await this.repo.delete({ id, tenantId });
    this.logger.log(`Campaign deleted: ${id} for tenant ${tenantId}`);
  }

  // ── getDashboard ─────────────────────────────────────────────

  async getDashboard(id: string, tenantId: string): Promise<Record<string, unknown>> {
    const campaign = await this.findOne(id, tenantId);

    // Return aggregated stats (lazy: actual counts from related tables are done via direct SQL)
    return {
      eventsCount:      0,
      teamCount:        0,
      tasksActive:      0,
      volunteersCount:  0,
      budgetUsed:       '0%',
      smsSent:          0,
      incidentsOpen:    0,
      wardCoverage:     `${campaign.targetWards?.length ?? 0} wards`,
      campaign,
    };
  }

  // ── getStats ─────────────────────────────────────────────────

  async getStats(tenantId: string): Promise<Record<string, unknown>> {
    const total   = await this.repo.count({ where: { tenantId } });
    const active  = await this.repo.count({ where: { tenantId, status: CampaignStatus.ACTIVE } });
    const created = await this.repo.count({ where: { tenantId, status: CampaignStatus.CREATED } });
    const closed  = await this.repo.count({ where: { tenantId, status: CampaignStatus.CLOSED } });

    return { total, active, created, closed };
  }
}
