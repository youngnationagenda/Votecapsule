/**
 * Vote Capsule™ Identity Service — Invitations Controller
 *
 * POST   /invitations
 * GET    /invitations
 * GET    /invitations/:token
 * POST   /invitations/:token/accept
 * DELETE /invitations/:id
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole, JwtPayload } from '@vote-capsule/types';
import { SubscriptionGuard } from '../common/subscription.guard';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @ApiBearerAuth('jwt')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create and send a user invitation' })
  @ApiResponse({ status: 201, description: 'Invitation created and sent' })
  @ApiResponse({ status: 403, description: 'No active subscription' })
  create(
    @Body() dto: CreateInvitationDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    const invitedBy = req.user?.sub ?? '';
    return this.invitationsService.create(dto, invitedBy);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'List invitations' })
  findAll(@Query('tenantId') tenantId?: string) {
    return this.invitationsService.findAll(tenantId);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Get invitation details by token (public — for invite acceptance UI)' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  findByToken(@Param('token') token: string) {
    return this.invitationsService.findByToken(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept an invitation (authenticated user)' })
  @ApiResponse({ status: 204, description: 'Invitation accepted' })
  async accept(
    @Param('token') token: string,
    @Body() _dto: AcceptInvitationDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<void> {
    const userId = req.user?.sub ?? '';
    await this.invitationsService.accept(token, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  async revoke(@Param('id') id: string): Promise<void> {
    await this.invitationsService.revoke(id);
  }
}
