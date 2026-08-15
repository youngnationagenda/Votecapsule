// ============================================================
// VoteCapsule — SubscriptionController
// REST endpoints for tenant subscriptions
// ============================================================
import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing', timestamp: new Date().toISOString() };
  }

  /** GET /subscriptions — list all subscriptions (admin view) */
  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  /** POST /subscriptions — create subscription with custom pricing */
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto);
  }

  /** GET /subscriptions/tenant/:tenantId */
  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionService.findByTenantId(tenantId);
  }

  /**
   * GET /subscriptions/tenant/:tenantId/active
   * Returns { active: boolean, planName?: string, status?: string }
   */
  @Get('tenant/:tenantId/active')
  async checkActive(@Param('tenantId') tenantId: string) {
    const sub = await this.subscriptionService.getActiveSubscription(tenantId);
    if (!sub) {
      return { active: false, tenantId };
    }
    return {
      active: true,
      tenantId,
      subscriptionId: sub.id,
      planId:         sub.planId,
      planCode:       sub.plan?.code,
      planName:       sub.plan?.name,
      status:         sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      metadata:       sub.metadata,
    };
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
