/**
 * Vote Capsule™ Tenant Service — Tenants Controller
 *
 * POST   /tenants
 * GET    /tenants
 * GET    /tenants/:id
 * PATCH  /tenants/:id
 * DELETE /tenants/:id
 * GET    /tenants/:id/settings
 * PATCH  /tenants/:id/settings
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole, PaginationQuery, JwtPayload } from '@vote-capsule/types';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant organization' })
  create(@Body() dto: CreateTenantDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.tenantsService.create(dto, req.user?.sub ?? '');
  }

  @Get()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  findAll(@Query() query: PaginationQuery) {
    return this.tenantsService.findAll(query);
  }

  @Get('stats')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Get tenant count statistics by type' })
  getStats() {
    return this.tenantsService.getTenantStats();
  }

  @Get(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN, SystemRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update tenant details' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a tenant (PLATFORM_SUPER_ADMIN only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tenantsService.softDelete(id);
  }

  @Get(':id/settings')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get tenant settings' })
  getSettings(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getSettings(id);
  }

  @Patch(':id/settings')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update tenant settings' })
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() settings: Record<string, unknown>,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<void> {
    await this.tenantsService.updateSettings(id, settings, req.user?.sub ?? '');
  }
}
