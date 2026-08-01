// ============================================================
// VoteCapsule — SubscriptionController
// REST endpoints for tenant subscriptions
// ============================================================
import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing', timestamp: new Date().toISOString() };
  }

  /** POST /subscriptions — create subscription */
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto);
  }

  /** GET /subscriptions/tenant/:tenantId */
  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionService.findByTenantId(tenantId);
  }

  /** GET /subscriptions/:id */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.subscriptionService.findById(id);
  }

  /** PUT /subscriptions/:id/upgrade — change plan */
  @Put(':id/upgrade')
  upgrade(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionService.upgrade(id, dto.planId!);
  }

  /** POST /subscriptions/:id/cancel */
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string; cancelAtPeriodEnd?: boolean },
  ) {
    return this.subscriptionService.cancel(id, body.reason, body.cancelAtPeriodEnd ?? false);
  }

  /** POST /subscriptions/:id/suspend */
  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.subscriptionService.suspend(id);
  }

  /** POST /subscriptions/:id/reactivate */
  @Post(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.subscriptionService.reactivate(id);
  }
}
