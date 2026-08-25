// ============================================================
// VoteCapsule™ — Campaign Materials Controller
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';

@Controller()
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  // ── Global catalogue endpoints ──────────────────────────────

  @Get('materials/categories')
  listCategories() {
    return this.service.listCategories();
  }

  @Get('materials/types')
  listTypes(@Query('category') category?: string) {
    return this.service.listTypes(category);
  }

  @Get('materials/types/:id')
  getType(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getType(id);
  }

  // ── Admin-only: create / update material types (x-platform-admin required) ─

  @Post('materials/types')
  @HttpCode(HttpStatus.CREATED)
  createType(
    @Body() dto: any,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin !== 'true') throw new BadRequestException('Platform admin access required');
    return this.service.createType(dto);
  }

  @Patch('materials/types/:id')
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin !== 'true') throw new BadRequestException('Platform admin access required');
    return this.service.updateType(id, dto);
  }

  // ── Campaign-scoped endpoints ────────────────────────────────

  @Get('campaigns/:campaignId/materials/orders')
  listOrders(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('status') status?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listOrders(c, t, status);
  }

  @Post('campaigns/:campaignId/materials/orders')
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.createOrder(c, dto, t, u);
  }

  @Patch('campaigns/:campaignId/materials/orders/:oid')
  updateOrder(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('oid', ParseUUIDPipe) oid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.updateOrder(oid, c, dto, t);
  }

  @Patch('campaigns/:campaignId/materials/orders/:oid/approve')
  approveOrder(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('oid', ParseUUIDPipe) oid: string,
    @Body('approved') approved: boolean,
    @Body('notes') notes: string,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.approveOrder(oid, c, t, u, approved, notes);
  }

  @Get('campaigns/:campaignId/materials/inventory')
  getInventory(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('wardCode') wardCode?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getInventory(c, t, wardCode);
  }

  @Post('campaigns/:campaignId/materials/distributions')
  @HttpCode(HttpStatus.CREATED)
  recordDistribution(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.recordDistribution(c, dto, t, u);
  }

  @Get('campaigns/:campaignId/materials/distributions')
  listDistributions(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('wardCode') wardCode?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listDistributions(c, t, wardCode);
  }
}
