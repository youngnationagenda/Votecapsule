// ============================================================
// VoteCapsule™ — Campaign Logistics Controller
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { LogisticsService } from './logistics.service';

@Controller('campaigns/:campaignId')
export class LogisticsController {
  constructor(private readonly service: LogisticsService) {}

  // ── Vehicles ──────────────────────────────────────────────────

  @Post('vehicles')
  @HttpCode(HttpStatus.CREATED)
  addVehicle(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.addVehicle(c, dto, t, u);
  }

  @Get('vehicles')
  listVehicles(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('status') status?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listVehicles(c, t, status);
  }

  @Patch('vehicles/:vid/status')
  updateVehicleStatus(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.updateVehicleStatus(vid, c, dto, t);
  }

  @Post('vehicles/:vid/trips')
  @HttpCode(HttpStatus.CREATED)
  recordTrip(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.recordTrip(vid, c, dto, t, u);
  }

  @Get('vehicles/:vid/trips')
  listTrips(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listTrips(vid, c, t);
  }

  // ── Equipment ─────────────────────────────────────────────────

  @Post('equipment')
  @HttpCode(HttpStatus.CREATED)
  addEquipment(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.addEquipment(c, dto, t, u);
  }

  @Get('equipment')
  listEquipment(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listEquipment(c, t, { status, type });
  }

  @Get('equipment/available')
  getAvailableEquipment(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    if (!start || !end) throw new BadRequestException('start and end query params required');
    return this.service.getAvailableEquipment(c, t, start, end);
  }

  @Patch('equipment/:eid/status')
  updateEquipmentStatus(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.updateEquipmentStatus(eid, c, dto, t, u);
  }
}
