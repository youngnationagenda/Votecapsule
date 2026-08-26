// ============================================================
// VoteCapsule™ — Campaign Suppliers Controller
// ============================================================
import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body,
  Headers, Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  list(
    @Headers('x-tenant-id')      t: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    // Platform admin sees all suppliers across all tenants (raw admin view)
    if (platformAdmin === 'true') {
      return this.service.listAll();
    }
    // All authenticated portal users: return their tenant suppliers + global shared suppliers.
    // x-tenant-id may be absent for campaign team members with geo-scoped roles —
    // fall back to global-only in that case (still shows Me Advertising catalogue).
    return this.service.list(t || 'c3d4e5f6-a7b8-9012-cdef-123456789012');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.create(dto, t, u);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(id, t, dto);
  }

  // ── Supplier Products ───────────────────────────────────────

  @Get('products/search')
  searchProducts(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q) throw new BadRequestException('q query parameter required');
    return this.service.searchProducts(q, parseInt(page ?? '1'), parseInt(limit ?? '20'));
  }

  @Get('compare/:materialTypeId')
  compareByMaterialType(@Param('materialTypeId', ParseUUIDPipe) id: string) {
    return this.service.compareByMaterialType(id);
  }

  @Get(':id/products')
  listProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listProducts(id, parseInt(page ?? '1'), parseInt(limit ?? '50'));
  }

  @Get(':id/products/:pid')
  getProduct(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @Param('pid', ParseUUIDPipe) pid: string,
  ) {
    return this.service.getProduct(pid, supplierId);
  }

  // ── Admin-level product management (x-platform-admin required) ─

  @Get('products')
  listAllProducts(
    @Headers('x-platform-admin') platformAdmin: string,
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
  ) {
    if (platformAdmin !== 'true') throw new BadRequestException('Platform admin access required');
    return this.service.listAllProducts(parseInt(page ?? '1'), parseInt(limit ?? '100'));
  }

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  createProduct(
    @Body() dto: any,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin !== 'true') throw new BadRequestException('Platform admin access required');
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin !== 'true') throw new BadRequestException('Platform admin access required');
    return this.service.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-platform-admin') platformAdmin: string,
  ) {
    if (platformAdmin !== 'true') throw new BadRequestException('Platform admin access required');
    return this.service.deleteProduct(id);
  }
}
