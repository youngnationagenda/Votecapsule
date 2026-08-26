/**
 * Vote Capsule™ Identity Service — Users Controller
 *
 * GET    /users
 * POST   /users
 * GET    /users/me
 * GET    /users/:id
 * PATCH  /users/:id
 * DELETE /users/:id
 * PATCH  /users/me/profile
 * GET    /users/me/devices
 * DELETE /users/me/devices/:id
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProvisionUserDto } from './dto/provision-user.dto';
import { UpdateCognitoAttributesDto } from './dto/update-cognito-attributes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole, PaginationQuery, JwtPayload } from '@vote-capsule/types';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN, SystemRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'List all platform users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@Query() query: PaginationQuery) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user (with roles + tenantId)' })
  @ApiResponse({ status: 200, description: 'Current user details including roles' })
  async getMe(@Req() req: Request & { user?: JwtPayload }) {
    const jwtUser = req.user;
    if (!jwtUser?.sub) return null;

    // Fetch fresh user record from DB
    const user = await this.usersService.findByEmailWithRoles(jwtUser.email);

    // Merge: DB profile + roles from DB (fresh) + JWT sub + tenantId
    return {
      id:           user?.id      ?? jwtUser.sub,
      email:        user?.email   ?? jwtUser.email,
      status:       user?.status  ?? 'active',
      emailVerified: user?.emailVerified ?? false,
      lastLoginAt:  user?.lastLoginAt ?? null,
      createdAt:    user?.createdAt ?? null,
      // roles: DB is source of truth (same query used when issuing JWT)
      roles:        user?.roles   ?? jwtUser.roles ?? [],
      tenantId:     user?.tenantId ?? jwtUser.tenantId ?? null,
    };
  }

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a new platform user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post('provision')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Provision a full user (Cognito + DB) — Super Admin only' })
  @ApiResponse({ status: 201, description: 'User provisioned with Cognito account, DB record, and roles' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  provision(@Body() dto: ProvisionUserDto) {
    return this.usersService.provisionUser(dto);
  }

  @Get(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN, SystemRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'User updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (PLATFORM_SUPER_ADMIN only)' })
  @ApiResponse({ status: 204, description: 'User deactivated' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.softDelete(id);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update the authenticated user\'s profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfile(
    @Req() req: Request & { user?: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ): Promise<void> {
    const userId = req.user?.sub ?? '';
    await this.usersService.updateProfile(userId, dto);
  }

  /**
   * PATCH /users/:id/attributes
   *
   * Internal endpoint — called by Campaign Service after role assignment
   * to sync custom:roles, custom:wardCode, custom:constituencyCode,
   * custom:candidateId into Cognito so the JWT authorizer propagates
   * them as x-* headers on the user's next request.
   *
   * Allowed by: PLATFORM_SUPER_ADMIN, TENANT_ADMIN, and internal
   * service-to-service calls (x-internal-service: campaign header).
   */
  @Patch(':id/attributes')
  @ApiOperation({ summary: 'Sync Cognito custom attributes after role assignment (internal)' })
  @ApiResponse({ status: 200, description: 'Cognito attributes updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateAttributes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCognitoAttributesDto,
    @Req() req: Request & { headers: Record<string, string | undefined> },
  ): Promise<{ updated: string[] }> {
    // Allow internal service-to-service calls OR admin roles
    const isInternal = (req as any).headers?.['x-internal-service'] === 'campaign';
    const jwtUser    = (req as any).user as (typeof req & { user?: { roles?: string[] } })['user'];
    const roles      = jwtUser?.roles ?? [];
    const isAdmin    = roles.includes('PLATFORM_SUPER_ADMIN') || roles.includes('TENANT_ADMIN');

    if (!isInternal && !isAdmin) {
      throw new (await import('@nestjs/common').then(m => m.ForbiddenException))(
        'Only internal services or admins may update Cognito attributes',
      );
    }

    return this.usersService.updateCognitoAttributes(id, dto);
  }
}
