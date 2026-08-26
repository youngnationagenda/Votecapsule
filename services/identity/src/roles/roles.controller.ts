/**
 * Vote Capsule™ Identity Service — Roles Controller
 *
 * GET    /roles
 * POST   /roles
 * GET    /roles/:id
 * PATCH  /roles/:id
 * DELETE /roles/:id
 * POST   /roles/:id/permissions
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { GatewayAuthGuard } from '../auth/guards/gateway-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@vote-capsule/types';

@ApiTags('roles')
@Controller('roles')
@UseGuards(GatewayAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'List all roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get role by ID with permissions' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const role = await this.rolesService.findById(id);
    const permissions = await this.rolesService.getRolePermissions(id);
    return { ...role, permissions };
  }

  @Patch(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiResponse({ status: 400, description: 'Cannot modify system roles' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role (system roles cannot be deleted)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rolesService.delete(id);
  }

  @Post(':id/permissions')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ): Promise<void> {
    await this.rolesService.assignPermissions(id, dto);
  }
}
