// ============================================================
// VoteCapsule™ — Campaign Design Controller
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Headers,
  HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { DesignService } from './design.service';

@Controller()
export class DesignController {
  constructor(private readonly service: DesignService) {}

  // ── Mockup templates (global, by material type) ──────────────

  @Get('mockup-templates/:materialTypeId')
  getTemplates(@Param('materialTypeId', ParseUUIDPipe) id: string) {
    return this.service.getTemplatesForType(id);
  }

  // ── Design requests (campaign-scoped) ────────────────────────

  @Get('campaigns/:campaignId/designs')
  list(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.list(c, t);
  }

  @Post('campaigns/:campaignId/designs')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.create(c, dto, t, u);
  }

  @Post('campaigns/:campaignId/designs/:did/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  generate(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.generate(did, c, t);
  }

  @Get('campaigns/:campaignId/designs/:did/preview')
  async getPreview(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getPreviewUrl(did, c, t);
    return { url };
  }

  @Patch('campaigns/:campaignId/designs/:did/approve')
  approve(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.approve(did, c, t, u);
  }

  @Patch('campaigns/:campaignId/designs/:did/reject')
  reject(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Body('reason') reason: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    if (!reason) throw new BadRequestException('Rejection reason is required');
    return this.service.reject(did, c, t, reason);
  }
}
