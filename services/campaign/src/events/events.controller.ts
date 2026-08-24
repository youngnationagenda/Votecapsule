// ============================================================
// VoteCapsule™ — Campaign Events Controller
// ============================================================
import {
  Controller, Get, Post, Put, Delete, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { EventsService }    from './events.service';
import { CreateEventDto }   from './dto/create-event.dto';
import { SubmitCapsuleDto } from './dto/submit-capsule.dto';

@Controller('campaigns/:campaignId/events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateEventDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.create(campaignId, dto, tenantId, userId);
  }

  @Get()
  findAll(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('wardCode')   wardCode?: string,
    @Query('eventType')  eventType?: string,
    @Query('start')      start?: string,
    @Query('end')        end?: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findAll(campaignId, tenantId, { wardCode, eventType, start, end });
  }

  @Get('calendar')
  getCalendar(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('start') start: string,
    @Query('end')   end: string,
    @Query('wardCode') wardCode?: string,
  ) {
    if (!tenantId || !start || !end) throw new BadRequestException('X-Tenant-Id, start, end required');
    return this.service.getCalendarView(campaignId, tenantId, start, end, wardCode);
  }

  @Get('conflicts')
  detectConflicts(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('startTime') startTime: string,
    @Query('endTime')   endTime: string,
    @Query('excludeEventId') excludeEventId?: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.detectConflicts(campaignId, tenantId, startTime, endTime, excludeEventId);
  }

  @Get(':eventId')
  findOne(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('eventId',    ParseUUIDPipe) eventId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findOne(eventId, campaignId, tenantId);
  }

  @Put(':eventId')
  update(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('eventId',    ParseUUIDPipe) eventId: string,
    @Body() dto: Partial<CreateEventDto>,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(eventId, campaignId, dto, tenantId);
  }

  @Delete(':eventId')
  cancel(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('eventId',    ParseUUIDPipe) eventId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    return this.service.cancel(eventId, campaignId, tenantId);
  }

  @Post(':eventId/capsule')
  @HttpCode(HttpStatus.CREATED)
  submitCapsule(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('eventId',    ParseUUIDPipe) eventId: string,
    @Body() dto: SubmitCapsuleDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId: string,
  ) {
    if (!tenantId || !userId) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.submitCapsule(eventId, campaignId, dto, tenantId, userId);
  }
}
