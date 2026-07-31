/**
 * Vote Capsule™ Identity Service — Auth Service
 *
 * Business logic for authentication flows.
 * Integrates with Amazon Cognito for user pool management.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokens } from '@vote-capsule/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly clientId: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.clientId = this.configService.getOrThrow<string>('COGNITO_CLIENT_ID');
  }

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokens | { challengeName: string; session: string }> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: dto.email,
          PASSWORD: dto.password,
        },
      });

      const response = await this.cognitoClient.send(command);

      // Handle MFA challenge
      if (response.ChallengeName === ChallengeNameType.SOFTWARE_TOKEN_MFA) {
        return {
          challengeName: response.ChallengeName,
          session: response.Session ?? '',
        };
      }

      if (!response.AuthenticationResult) {
        throw new UnauthorizedException('Authentication failed');
      }

      const { AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      if (!AccessToken || !RefreshToken || !ExpiresIn) {
        throw new UnauthorizedException('Invalid authentication result');
      }

      // Update last login timestamp
      await this.usersService.updateLastLogin(dto.email);

      // Log authentication event
      await this.usersService.logAuthEvent({
        email: dto.email,
        eventType: 'login',
        ipAddress,
        userAgent,
        success: true,
      });

      return {
        accessToken: AccessToken,
        refreshToken: RefreshToken,
        expiresIn: ExpiresIn,
        tokenType: 'Bearer',
      };
    } catch (error) {
      await this.usersService.logAuthEvent({
        email: dto.email,
        eventType: 'login',
        ipAddress,
        userAgent,
        success: false,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      this.logger.warn(`Login failed for ${dto.email}: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async verifyMfa(
    dto: MfaVerifyDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokens> {
    try {
      const command = new RespondToAuthChallengeCommand({
        ClientId: this.clientId,
        ChallengeName: ChallengeNameType.SOFTWARE_TOKEN_MFA,
        Session: dto.session,
        ChallengeResponses: {
          USERNAME: dto.email,
          SOFTWARE_TOKEN_MFA_CODE: dto.mfaCode,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult?.AccessToken) {
        throw new UnauthorizedException('MFA verification failed');
      }

      const { AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      await this.usersService.logAuthEvent({
        email: dto.email,
        eventType: 'mfa_success',
        ipAddress,
        userAgent,
        success: true,
      });

      return {
        accessToken: AccessToken ?? '',
        refreshToken: RefreshToken ?? '',
        expiresIn: ExpiresIn ?? 3600,
        tokenType: 'Bearer',
      };
    } catch (error) {
      await this.usersService.logAuthEvent({
        email: dto.email,
        eventType: 'mfa_failure',
        ipAddress,
        userAgent,
        success: false,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnauthorizedException('MFA verification failed');
    }
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: dto.refreshToken,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult?.AccessToken) {
        throw new UnauthorizedException('Token refresh failed');
      }

      const { AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      return {
        accessToken: AccessToken ?? '',
        refreshToken: RefreshToken ?? dto.refreshToken,
        expiresIn: ExpiresIn ?? 3600,
        tokenType: 'Bearer',
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(accessToken: string, email: string): Promise<void> {
    try {
      const command = new GlobalSignOutCommand({ AccessToken: accessToken });
      await this.cognitoClient.send(command);
      await this.usersService.logAuthEvent({
        email,
        eventType: 'logout',
        ipAddress: '',
        userAgent: '',
        success: true,
      });
    } catch (error) {
      this.logger.warn(`Logout warning for ${email}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  async requestPasswordReset(dto: PasswordResetRequestDto): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: dto.email,
      });
      await this.cognitoClient.send(command);
    } catch (error) {
      // Silently handle — don't reveal whether email exists
      this.logger.warn(
        `Password reset request for ${dto.email}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  async resetPassword(dto: PasswordResetDto): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: dto.email,
        ConfirmationCode: dto.code,
        Password: dto.newPassword,
      });
      await this.cognitoClient.send(command);
    } catch {
      throw new BadRequestException('Password reset failed — invalid or expired code');
    }
  }
}
