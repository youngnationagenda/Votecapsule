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

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly service: CampaignService) {}

  // ── Create ────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCampaignDto,
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-user-id')        userId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    // Platform admin can create on behalf of any tenant (tenantId in body)
    if (!userId) throw new BadRequestException('X-User-Id required');
    if (platformAdmin !== 'true' && !tenantId) {
      throw new BadRequestException('X-Tenant-Id required');
    }
    const effectiveTenantId = tenantId || dto.tenantId;
    if (!effectiveTenantId) throw new BadRequestException('tenantId required in body for platform admin');
    return this.service.create({ ...dto, tenantId: effectiveTenantId }, userId);
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @Headers('x-tenant-id')      tenantId: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin === 'true') {
      return this.service.updateGlobal(id, dto);
    }
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(id, tenantId, dto);
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
