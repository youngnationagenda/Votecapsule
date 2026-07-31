/**
 * Vote Capsule™ Identity Service — Devices Controller
 *
 * GET    /users/me/devices
 * POST   /users/me/devices
 * DELETE /users/me/devices/:id
 * POST   /users/me/devices/:id/trust  (admin only)
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole, JwtPayload } from '@vote-capsule/types';

@ApiTags('users')
@Controller('users/me/devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List current user\'s registered devices' })
  getMyDevices(@Req() req: Request & { user?: JwtPayload }) {
    return this.devicesService.findByUser(req.user?.sub ?? '');
  }

  @Post()
  @ApiOperation({ summary: 'Register a new device for the current user' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  registerDevice(
    @Req() req: Request & { user?: JwtPayload },
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devicesService.register(req.user?.sub ?? '', dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a device from current user account' })
  async removeDevice(
    @Req() req: Request & { user?: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.devicesService.removeDevice(req.user?.sub ?? '', id);
  }

  @Post(':id/trust')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Grant trust to a device (Admin only)',
    description: 'Only trusted devices can submit evidence capsules.',
  })
  async trustDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<void> {
    await this.devicesService.trustDevice(id, req.user?.sub ?? '');
  }
}
