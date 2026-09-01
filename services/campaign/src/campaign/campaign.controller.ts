// ============================================================
// VoteCapsule™ — Campaign Controller
// W1 FIX: x-platform-admin bypass — admin portal can list all
//         campaigns across all tenants without x-tenant-id
// ============================================================
import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { CampaignService }      from './campaign.service';
import { CreateCampaignDto }    from './dto/create-campaign.dto';
import { UpdateCampaignDto }    from './dto/update-campaign.dto';
import { CampaignStatus }       from './entities/campaign.entity';
import { BudgetAutoService }    from '../budget/budget-auto.service';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly service:     CampaignService,
    private readonly budgetAuto:  BudgetAutoService,
  ) {}

  // ── Create ────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCampaignDto,
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-user-id')        userId: string,
    @Headers('x-user-role')      userRole: string,
    @Headers('x-candidate-id')   headerCandidateId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id required');
    if (platformAdmin !== 'true' && !tenantId) {
      throw new BadRequestException('X-Tenant-Id required');
    }
    const effectiveTenantId = tenantId || dto.tenantId;
    if (!effectiveTenantId) throw new BadRequestException('tenantId required in body for platform admin');

    // Resolve candidateId:
    //   1. Explicitly supplied in body (party admin entering a UUID)
    //   2. x-candidate-id header (candidate user portal)
    //   3. userId itself when role is a candidate role
    //   4. null — party/admin creating a campaign not yet tied to a candidate
    const CANDIDATE_ROLES = ['CANDIDATE', 'CANDIDATE_CAMPAIGN_PRINCIPAL', 'CAMPAIGN_MANAGER'];
    const effectiveCandidateId =
      dto.candidateId ||
      headerCandidateId ||
      (CANDIDATE_ROLES.includes((userRole || '').toUpperCase()) ? userId : null) ||
      null;

    const campaign = await this.service.create({
      ...dto,
      tenantId:    effectiveTenantId,
      candidateId: effectiveCandidateId ?? undefined,
    }, userId);

    // Auto-turbulate budget: non-blocking — resolve IEBC limit + seed categories
    // Fires after response is returned so campaign creation is never delayed
    setImmediate(() => {
      this.budgetAuto.turbulateForCampaign(campaign.id, effectiveTenantId)
        .catch(() => { /* non-fatal — budget can be turbulated manually */ });
    });

    return campaign;
  }

  // ── List All ──────────────────────────────────────────────────

  @Get()
  findAll(
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-platform-admin') platformAdmin: string,
    @Query('candidateId')        candidateId?: string,
    @Query('electionId')         electionId?: string,
    @Query('status')             status?: string,
  ) {
    // Platform Super Admin — cross-tenant view (admin portal campaign list)
    if (platformAdmin === 'true') {
      return this.service.findAllGlobal(status, candidateId);
    }
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findAll(tenantId, status, candidateId);
  }

  // ── Get Stats ─────────────────────────────────────────────────

  @Get('stats')
  getStats(
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin === 'true') {
      return this.service.getGlobalStats();
    }
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getStats(tenantId);
  }

  // ── Get One ───────────────────────────────────────────────────

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin === 'true') {
      return this.service.findOneGlobal(id);
    }
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findOne(id, tenantId);
  }

  // ── Update ────────────────────────────────────────────────────

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin === 'true') {
      const updated = await this.service.updateGlobal(id, dto);
      setImmediate(() => {
        this.budgetAuto.turbulateForCampaign(updated.id, updated.tenantId)
          .catch(() => {});
      });
      return updated;
    }
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    const updated = await this.service.update(id, tenantId, dto);
    setImmediate(() => {
      this.budgetAuto.turbulateForCampaign(updated.id, tenantId)
        .catch(() => {});
    });
    return updated;
  }

  // ── Update Status ─────────────────────────────────────────────

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: CampaignStatus,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    if (!status)   throw new BadRequestException('status is required');
    return this.service.updateStatus(id, tenantId, status);
  }

  // ── Delete ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.remove(id, tenantId);
  }

  // ── Dashboard ─────────────────────────────────────────────────

  @Get(':id/dashboard')
  getDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin === 'true') {
      return this.service.getDashboardGlobal(id);
    }
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getDashboard(id, tenantId);
  }
}
