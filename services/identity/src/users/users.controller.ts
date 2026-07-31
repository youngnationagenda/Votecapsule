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
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user details' })
  getMe(@Req() req: Request & { user?: JwtPayload }) {
    const userId = req.user?.sub;
    if (!userId) return null;
    return this.usersService.findById(userId);
  }

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a new platform user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
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
}
