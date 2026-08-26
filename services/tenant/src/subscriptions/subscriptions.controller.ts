/**
 * GET    /tenants/:id/subscription
 * POST   /tenants/:id/subscription
 * PATCH  /tenants/:id/subscription
 */

import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole } from '@vote-capsule/types';

@ApiTags('subscriptions')
@Controller('tenants/:id/subscription')
@UseGuards(GatewayAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get active subscription for a tenant' })
  findOne(@Param('id', ParseUUIDPipe) tenantId: string) {
    return this.subscriptionsService.findByTenant(tenantId);
  }

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Create subscription for a tenant' })
  create(@Param('id', ParseUUIDPipe) tenantId: string, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(tenantId, dto);
  }

  @Patch()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tenant subscription' })
  update(@Param('id', ParseUUIDPipe) tenantId: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(tenantId, dto);
  }
}
