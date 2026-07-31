/**
 * Vote Capsule™ Identity Service — Auth Controller
 *
 * POST /auth/login
 * POST /auth/logout
 * POST /auth/refresh
 * POST /auth/mfa/verify
 * POST /auth/password/reset-request
 * POST /auth/password/reset
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate a user',
    description:
      'Authenticates against Amazon Cognito. May return MFA challenge if MFA is enabled.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful — returns tokens or MFA challenge' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Sign out the authenticated user' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(
    @Headers('authorization') authorization: string,
    @Req() req: Request & { user?: { email?: string } },
  ): Promise<void> {
    const accessToken = authorization?.replace('Bearer ', '') ?? '';
    const email = req.user?.email ?? '';
    await this.authService.logout(accessToken, email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({ status: 200, description: 'New tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code and complete authentication' })
  @ApiResponse({ status: 200, description: 'MFA verified — tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async verifyMfa(@Body() dto: MfaVerifyDto, @Req() req: Request) {
    const ipAddress = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    return this.authService.verifyMfa(dto, ipAddress, userAgent);
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a password reset email',
    description: 'Sends a password reset code via Amazon Cognito. Always returns 202 regardless of whether the email exists (security: prevents email enumeration).',
  })
  @ApiResponse({ status: 202, description: 'Password reset email sent if account exists' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto): Promise<void> {
    await this.authService.requestPasswordReset(dto);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm password reset with code' })
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset code' })
  async resetPassword(@Body() dto: PasswordResetDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }
}
