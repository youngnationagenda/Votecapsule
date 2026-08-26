import {
  Controller, Get, Post, Param, Body, Headers, Query,
  HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BudgetService } from './budget.service';

@Controller('campaigns/:campaignId')
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Post('budget')
  @HttpCode(HttpStatus.CREATED)
  createBudget(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.createBudget(c, dto, t, u);
  }

  @Get('budget')
  getBudget(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getBudgetSummary(c, t);
  }

  @Get('budget/categories')
  getByCategory(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getByCategory(c, t);
  }

  @Get('budget/iebc')
  getIebcStatus(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getIebcStatus(c, t);
  }

  @Post('expenses')
  @HttpCode(HttpStatus.CREATED)
  recordExpense(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.recordExpense(c, dto, t, u);
  }

  @Get('expenses')
  listExpenses(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string, @Query('wardCode') wardCode?: string, @Query('categoryId') categoryId?: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listExpenses(c, t, { wardCode, categoryId });
  }

  @Post('contributions')
  @HttpCode(HttpStatus.CREATED)
  recordContribution(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: any, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.recordContribution(c, dto, t, u);
  }

  @Get('contributions')
  listContributions(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listContributions(c, t);
  }

  // ── Budget File Import ─────────────────────────────────────
  // POST /campaigns/:campaignId/budget/import
  // Accepts CSV, XLSX, DOCX — parses line items and bulk-creates expenses
  @Post('budget/import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async importBudgetFile(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!file) throw new BadRequestException('File is required');
    return this.service.importBudgetFile(c, file, t, u);
  }

  // ── Budget Allocation ──────────────────────────────────────
  // POST /campaigns/:campaignId/budget/allocate
  // Sets category-level budget allocations from smart planner or manual input
  @Post('budget/allocate')
  @HttpCode(HttpStatus.OK)
  async allocateBudget(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: { allocations: Array<{ categoryCode: string; amount: number }> },
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!dto?.allocations?.length) throw new BadRequestException('allocations array is required');
    return this.service.allocateBudget(c, dto.allocations, t, u);
  }

  // ── Campaign Geography ─────────────────────────────────────
  // GET /campaigns/:campaignId/geography
  // Returns ward count, registered voters, polling stations for the campaign's constituency
  @Get('geography')
  async getCampaignGeography(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getCampaignGeography(c, t);
  }
}
