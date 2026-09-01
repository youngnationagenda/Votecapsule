// ============================================================
// VoteCapsule™ — Campaign Service
// ============================================================
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CreateCampaignDto }  from './dto/create-campaign.dto';
import { UpdateCampaignDto }  from './dto/update-campaign.dto';

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
    private readonly dataSource: DataSource,
  ) {}

  // ── create ─────────────────────────────────────────────────

  async create(dto: CreateCampaignDto, userId: string): Promise<Campaign> {
    // Merge goals — ensure targetPosition is preserved and normalised
    const mergedGoals = { ...(dto.goals ?? {}) };

    // Normalise targetPosition to uppercase
    if (mergedGoals.targetPosition) {
      mergedGoals.targetPosition = String(mergedGoals.targetPosition)
        .toUpperCase()
        .trim()
        .replace(/[\s\-]+/g, '_');
    }

    // PRESIDENT campaigns are national scope — clear any stale geography if set
    const pos = String(mergedGoals.targetPosition ?? '').toUpperCase();
    if (pos === 'PRESIDENT' || pos === 'PARTY' || pos === 'PARTY_WIDE') {
      // National scope — geography fields are optional/unused for limit resolution
      // but we keep them if explicitly supplied (e.g., party HQ county)
      mergedGoals.iebcIsNational = true;
    }

    const entity = this.repo.create({
      ...dto,
      status:      CampaignStatus.CREATED,
      targetWards: dto.targetWards ?? [],
      goals:       mergedGoals,
      createdBy:   userId,
    });
    const saved = await this.repo.save(entity);
    this.logger.log(
      `Campaign created: ${saved.id} ` +
      `pos=${mergedGoals.targetPosition ?? 'not-set'} ` +
      `tenant=${saved.tenantId}`,
    );
    return saved;
  }

  // ── findAll ─────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    status?: string,
    candidateId?: string,
  ): Promise<Campaign[]> {
    const where: FindOptionsWhere<Campaign> = { tenantId };
    if (status)      where.status      = status as CampaignStatus;
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

  async update(
    id: string,
    tenantId: string,
    dto: UpdateCampaignDto,
  ): Promise<Campaign> {
    const c = await this.findOne(id, tenantId);
    if ([CampaignStatus.CLOSED, CampaignStatus.AUDITED, CampaignStatus.ARCHIVED].includes(c.status)) {
      throw new BadRequestException(`Cannot update campaign in status: ${c.status}`);
    }
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  // ── updateStatus ────────────────────────────────────────────

  async updateStatus(
    id: string,
    tenantId: string,
    newStatus: CampaignStatus,
  ): Promise<Campaign> {
    const c = await this.findOne(id, tenantId);
    const allowed = STATUS_TRANSITIONS[c.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition campaign from '${c.status}' to '${newStatus}'. ` +
        `Allowed: [${allowed.join(', ')}]`,
      );
    }
    c.status = newStatus;
    return this.repo.save(c);
  }

  // ── remove ──────────────────────────────────────────────────

  async remove(id: string, tenantId: string): Promise<void> {
    const c = await this.findOne(id, tenantId);
    const noDeleteStatuses = [
      CampaignStatus.ACTIVE, CampaignStatus.SUSPENDED,
      CampaignStatus.CLOSED, CampaignStatus.AUDITED, CampaignStatus.ARCHIVED,
    ];
    if (noDeleteStatuses.includes(c.status)) {
      throw new BadRequestException(
        `Cannot delete campaign in status: ${c.status}. Suspend it first.`,
      );
    }
    await this.repo.delete({ id, tenantId });
    this.logger.log(`Campaign deleted: ${id} for tenant ${tenantId}`);
  }

  // ── getDashboard ─────────────────────────────────────────────
  // Real COUNT queries — no more hardcoded zeros

  async getDashboard(
    id: string,
    tenantId: string,
  ): Promise<Record<string, unknown>> {
    const campaign = await this.findOne(id, tenantId);

    const [
      eventsRow,
      teamRow,
      tasksRow,
      volunteersRow,
      budgetRow,
      smsBatchRow,
      incidentsRow,
      coveredWardsRow,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM campaign_events
         WHERE campaign_id=$1 AND tenant_id=$2 AND status NOT IN ('cancelled','postponed')`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM campaign_team_members
         WHERE campaign_id=$1 AND tenant_id=$2 AND status='active'`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM campaign_tasks
         WHERE campaign_id=$1 AND tenant_id=$2 AND status IN ('todo','in_progress')`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM campaign_volunteers
         WHERE campaign_id=$1 AND tenant_id=$2 AND status='active'`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT total_allocated, total_spent, iebc_spending_limit
         FROM campaign_budgets WHERE campaign_id=$1 AND tenant_id=$2 LIMIT 1`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM campaign_sms_batches
         WHERE campaign_id=$1 AND tenant_id=$2`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM campaign_incidents
         WHERE campaign_id=$1 AND tenant_id=$2 AND status NOT IN ('resolved','closed')`,
        [id, tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT ward_code)::int AS count FROM campaign_events
         WHERE campaign_id=$1 AND tenant_id=$2 AND ward_code IS NOT NULL`,
        [id, tenantId],
      ),
    ]);

    const allocated  = parseFloat(budgetRow[0]?.total_allocated ?? '0');
    const spent      = parseFloat(budgetRow[0]?.total_spent     ?? '0');
    const iebcLimit  = parseFloat(budgetRow[0]?.iebc_spending_limit ?? '0');
    const budgetPct  = allocated > 0
      ? `${Math.round((spent / allocated) * 100)}%`
      : '0%';
    const iebcPct    = iebcLimit > 0
      ? `${Math.round((spent / iebcLimit) * 100)}% of IEBC limit`
      : null;
    const totalWards = campaign.targetWards?.length ?? 0;
    const covered    = coveredWardsRow[0]?.count ?? 0;

    return {
      eventsCount:     eventsRow[0]?.count     ?? 0,
      teamCount:       teamRow[0]?.count       ?? 0,
      tasksActive:     tasksRow[0]?.count      ?? 0,
      volunteersCount: volunteersRow[0]?.count ?? 0,
      budgetUsed:      budgetPct,
      iebcStatus:      iebcPct,
      smsSent:         smsBatchRow[0]?.count   ?? 0,
      incidentsOpen:   incidentsRow[0]?.count  ?? 0,
      wardCoverage:    totalWards > 0
        ? `${covered}/${totalWards} wards`
        : `${covered} wards covered`,
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

  // ── Platform Super Admin — cross-tenant global methods ───────
  // W1 FIX: These bypass tenant isolation for PLATFORM_SUPER_ADMIN only.
  //         The role guard ensures only that role can reach these paths.

  async findAllGlobal(status?: string, candidateId?: string): Promise<Campaign[]> {
    const where: FindOptionsWhere<Campaign> = {};
    if (status)      where.status      = status as CampaignStatus;
    if (candidateId) where.candidateId = candidateId;
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take:  500,
    });
  }

  async findOneGlobal(id: string): Promise<Campaign> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Campaign ${id} not found`);
    return c;
  }

  async updateGlobal(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const c = await this.findOneGlobal(id);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async getGlobalStats(): Promise<Record<string, unknown>> {
    const total    = await this.repo.count();
    const active   = await this.repo.count({ where: { status: CampaignStatus.ACTIVE } });
    const planning = await this.repo.count({ where: { status: CampaignStatus.PLANNING } });
    const closed   = await this.repo.count({ where: { status: CampaignStatus.CLOSED } });
    const archived = await this.repo.count({ where: { status: CampaignStatus.ARCHIVED } });

    // Count by tenant
    const byTenant = await this.dataSource.query(
      `SELECT tenant_id, COUNT(*)::int AS count FROM campaigns GROUP BY tenant_id ORDER BY count DESC`,
    );
    return { total, active, planning, closed, archived, byTenant };
  }

  async getDashboardGlobal(id: string): Promise<Record<string, unknown>> {
    // For platform admin: look up campaign without tenant scope, then delegate
    const c = await this.findOneGlobal(id);
    return this.getDashboard(id, c.tenantId);
  }
}
