/**
 * Vote Capsule™ Tenant Service — Members Controller
 *
 * GET    /tenants/:id/members
 * POST   /tenants/:id/members
 * DELETE /tenants/:id/members/:userId
 * PATCH  /tenants/:id/members/:userId/role
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole } from '@vote-capsule/types';

@ApiTags('members')
@Controller('tenants/:id/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'List all members of a tenant' })
  findAll(@Param('id', ParseUUIDPipe) tenantId: string) {
    return this.membersService.findByTenant(tenantId);
  }

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Add a user to a tenant' })
  addMember(@Param('id', ParseUUIDPipe) tenantId: string, @Body() dto: AddMemberDto) {
    return this.membersService.addMember(tenantId, dto);
  }

  @Delete(':userId')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a tenant' })
  async removeMember(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.membersService.removeMember(tenantId, userId);
  }

  @Patch(':userId/role')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change a member\'s role within the tenant' })
  async updateRole(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<void> {
    await this.membersService.updateMemberRole(tenantId, userId, dto);
  }
}
