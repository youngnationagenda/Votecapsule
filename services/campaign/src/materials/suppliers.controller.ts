// ============================================================
// VoteCapsule™ — Campaign Suppliers Controller
// ============================================================
import {
  Controller, Get, Post, Put, Param, Body,
  Headers, Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  list(@Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.list(t);
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
}
