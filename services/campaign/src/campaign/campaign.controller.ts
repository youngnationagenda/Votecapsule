// ============================================================
// VoteCapsule™ — Campaign Controller
// ============================================================
import {
  Controller, Get, Post, Put, Patch, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { CampaignService }      from './campaign.service';
import { CreateCampaignDto }    from './dto/create-campaign.dto';
import { UpdateCampaignDto }    from './dto/update-campaign.dto';
import { CampaignStatus }       from './entities/campaign.entity';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly service: CampaignService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCampaignDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    if (!userId)   throw new BadRequestException('X-User-Id required');
    return this.service.create({ ...dto, tenantId }, userId);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('candidateId') candidateId?: string,
    @Query('electionId')  electionId?: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findAll(tenantId, undefined, candidateId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findOne(id, tenantId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(id, tenantId, dto);
  }

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

  @Get(':id/dashboard')
  getDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getDashboard(id, tenantId);
  }
}
