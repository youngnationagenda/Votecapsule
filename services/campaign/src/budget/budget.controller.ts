import { Controller, Get, Post, Param, Body, Headers, Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
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
}
