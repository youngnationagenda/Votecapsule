import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Headers, Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('campaigns/:campaignId')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Post('teams')
  @HttpCode(HttpStatus.CREATED)
  createTeam(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.createTeam(c, dto, t, u);
  }

  @Get('teams')
  findTeams(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findTeams(c, t);
  }

  @Post('teams/:teamId/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(@Param('campaignId', ParseUUIDPipe) c: string, @Param('teamId', ParseUUIDPipe) teamId: string, @Body() dto: any, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.addMember(teamId, c, dto, t);
  }

  @Delete('teams/:teamId/members/:userId')
  removeMember(@Param('campaignId', ParseUUIDPipe) c: string, @Param('teamId', ParseUUIDPipe) teamId: string, @Param('userId', ParseUUIDPipe) userId: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.removeMember(teamId, userId, c, t);
  }

  @Post('volunteers')
  @HttpCode(HttpStatus.CREATED)
  registerVolunteer(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.registerVolunteer(c, dto, t, u);
  }

  @Get('volunteers')
  listVolunteers(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string, @Query('wardCode') wardCode?: string, @Query('status') status?: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listVolunteers(c, t, { wardCode, status });
  }

  @Patch('volunteers/:id')
  updateVolunteer(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.updateVolunteer(id, c, dto, t);
  }

  // ── Role assignment endpoints ────────────────────────────────

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  assignRole(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    if (!dto.userId || !dto.role) throw new BadRequestException('userId and role are required');
    return this.service.assignRole(c, dto, t);
  }

  @Get('roles')
  listRoles(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listRoles(c, t);
  }

  @Patch('roles/:userId')
  updateRole(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.updateRole(c, userId, dto, t);
  }

  @Delete('roles/:userId')
  removeRole(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.removeRole(c, userId, t);
  }
}
