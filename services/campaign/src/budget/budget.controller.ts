import {
  Controller, Get, Post, Param, Body, Headers, Query,
  HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BudgetService }     from './budget.service';
import { BudgetAutoService }  from './budget-auto.service';

@Controller('campaigns/:campaignId')
export class BudgetController {
  constructor(
    private readonly service: BudgetService,
    private readonly autoService: BudgetAutoService,
  ) {}

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

  /**
   * GET /campaigns/:id/budget/iebc-preview
   * Preview the IEBC spending limit for the campaign's current position + geography
   * WITHOUT writing to the DB. Used by frontend step-3 to show the auto-limit.
   * Also accepts query params to preview for a different position/geography combo
   * before the campaign is created: ?position=GOVERNOR&countyCode=047
   */
  @Get('budget/iebc-preview')
  async getIebcPreview(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('position')          position?: string,
    @Query('countyCode')        countyCode?: string,
    @Query('constituencyCode')  constituencyCode?: string,
    @Query('wardCode')          wardCode?: string,
    @Query('isParty')           isParty?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    // If query params provided, use them directly (pre-create preview)
    if (position) {
      const result = await this.autoService.previewLimit(
        position,
        countyCode,
        constituencyCode,
        wardCode,
        isParty === 'true',
      );
      return { data: result };
    }
    // Otherwise derive from the campaign's current state
    const result = await this.autoService.turbulateForCampaign(c, t);
    // Return preview only — turbulate already wrote to DB, that's fine
    return { data: result };
  }

  /**
   * POST /campaigns/:id/budget/turbulate
   * Trigger IEBC budget auto-turbulation for an existing campaign.
   * Resolves position+geography → sets iebc_spending_limit → seeds 11 category allocations.
   * Idempotent — safe to call multiple times.
   */
  @Post('budget/turbulate')
  @HttpCode(HttpStatus.OK)
  async turbulateBudget(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id')   u: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const result = await this.autoService.turbulateForCampaign(c, t);
    if (!result) {
      return {
        data: null,
        message: 'Budget turbulation skipped — campaign missing targetPosition or geography.',
      };
    }
    return { data: result };
  }

  @Get('budget/iebc')
  getIebcStatus(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getIebcStatus(c, t);
  }

  /**
   * GET /campaigns/:id/budget/iebc-breakdown
   * Returns per-category IEBC spend breakdown with warnings + reallocation suggestions.
   * Aggregates expenses → 11 IEBC categories → computes spend/limit/pct/warnings.
   */
  @Get('budget/iebc-breakdown')
  getIebcBreakdown(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getIebcBreakdown(c, t);
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
    @UploadedFile() file: any,
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

  // ── Budget Template ────────────────────────────────────────
  // GET /campaigns/:campaignId/budget/template
  // Returns the 11 IEBC gazette budget categories pre-filled with
  // amounts scaled to this campaign's IEBC spending limit.
  // ?format=json (default) | csv
  //
  // Rules:
  //   PRESIDENT / PARTY → exact gazette Fifth Schedule KES amounts
  //   All others        → proportional share of position-specific limit
  @Get('budget/template')
  async getBudgetTemplate(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('format') format?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const result = await this.service.getBudgetTemplate(c, t, format ?? 'json');
    // CSV: return raw string with appropriate content-type hint in envelope
    if ((format ?? 'json') === 'csv') {
      return { data: result, contentType: 'text/csv', filename: `budget-template-${c}.csv` };
    }
    return { data: result };
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
