import { Controller, Get, Post, Patch, Param, Body, Headers, Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { CommunicationsService } from './communications.service';

@Controller('campaigns/:campaignId')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  // SMS Templates
  @Post('sms/templates')
  @HttpCode(HttpStatus.CREATED)
  createTemplate(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.createTemplate(c, dto, t, u);
  }

  @Get('sms/templates')
  listTemplates(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listTemplates(c, t);
  }

  @Patch('sms/templates/:id/approve')
  approveTemplate(@Param('campaignId', ParseUUIDPipe) c: string, @Param('id', ParseUUIDPipe) id: string, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.approveTemplate(id, c, t, u);
  }

  // SMS Sending
  @Post('sms/send')
  @HttpCode(HttpStatus.CREATED)
  sendBatch(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.sendBatch(c, dto, t, u);
  }

  @Get('sms/batches')
  listBatches(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listBatches(c, t);
  }

  @Get('sms/batches/:batchId')
  getBatch(@Param('campaignId', ParseUUIDPipe) c: string, @Param('batchId', ParseUUIDPipe) id: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getBatch(id, c, t);
  }

  @Get('sms/stats')
  getSmsStats(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getSmsStats(c, t);
  }

  // Incidents
  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  createIncident(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.createIncident(c, dto, t, u);
  }

  @Get('incidents')
  findIncidents(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string, @Query('severity') severity?: string, @Query('status') status?: string, @Query('wardCode') wardCode?: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findIncidents(c, t, { severity, status, wardCode });
  }

  @Patch('incidents/:id')
  updateIncident(@Param('campaignId', ParseUUIDPipe) c: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.updateIncident(id, c, dto, t);
  }

  @Patch('incidents/:id/escalate')
  escalateIncident(@Param('campaignId', ParseUUIDPipe) c: string, @Param('id', ParseUUIDPipe) id: string, @Body('escalatedTo') escalatedTo: string, @Body('reason') reason: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.escalateIncident(id, c, t, escalatedTo, reason);
  }

  @Patch('incidents/:id/resolve')
  resolveIncident(@Param('campaignId', ParseUUIDPipe) c: string, @Param('id', ParseUUIDPipe) id: string, @Body('resolution') resolution: string, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.resolveIncident(id, c, t, u, resolution);
  }
}
