// ============================================================
// VoteCapsule™ — Outdoor Advertising Controller
// ============================================================
import {
  Controller, Get, Post, Put, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { OutdoorService } from './outdoor.service';

@Controller('campaigns/:campaignId/outdoor')
export class OutdoorController {
  constructor(private readonly service: OutdoorService) {}

  @Post()
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

  @Get()
  findAll(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('ward_code') wardCode?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findAll(c, t, { wardCode, type, status });
  }

  @Get('coverage')
  getCoverage(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getCoverage(c, t);
  }

  @Get(':pid')
  findOne(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('pid', ParseUUIDPipe) pid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findOne(pid, c, t);
  }

  @Put(':pid')
  update(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('pid', ParseUUIDPipe) pid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(pid, c, dto, t);
  }

  @Post(':pid/condition')
  @HttpCode(HttpStatus.CREATED)
  reportCondition(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('pid', ParseUUIDPipe) pid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.reportCondition(pid, c, dto, t, u);
  }
}
