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
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  AdminUpdateUserAttributesCommand,
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

// ── Extended user shape for campaign role claims ───────────────
interface UserWithClaims {
  id: string;
  email: string;
  cognitoSub: string | null;
  roles: string[];
  tenantId: string | null;
  // Campaign role geography + identity fields
  wardCode?: string | null;
  constituencyCode?: string | null;
  candidateId?: string | null;
  platformAdmin?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly clientId: string;
  private readonly userPoolId: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.clientId   = this.configService.getOrThrow<string>('COGNITO_CLIENT_ID');
    this.userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID', 'us-east-1_i3N2tg34A');
  }

  // ── Sync campaign-scoped claims into Cognito custom attributes ─
  // Called after login so the Cognito ID token carries these for the
  // Lambda authorizer to extract and forward as x-* headers.
  private async syncCognitoClaims(user: UserWithClaims): Promise<void> {
    if (!user.cognitoSub) return;
    try {
      const primaryRole = user.roles?.[0] ?? '';
      const isPlatformAdmin = (
        primaryRole === 'PLATFORM_SUPER_ADMIN' ||
        primaryRole === 'ADMIN' ||
        (user.platformAdmin === true)
      );

      // Look up ward/constituency/candidateId from DB (campaign_team_members)
      const extendedClaims = await this.usersService
        .getCampaignClaims(user.id, user.tenantId ?? undefined)
        .catch(() => ({
          wardCode: null,
          constituencyCode: null,
          candidateId: null,
        }));

      const attrs = [
        { Name: 'custom:userId',           Value: user.id },
        { Name: 'custom:tenantId',         Value: user.tenantId ?? '' },
        { Name: 'custom:roles',            Value: primaryRole },
        { Name: 'custom:wardCode',         Value: extendedClaims.wardCode        ?? user.wardCode        ?? '' },
        { Name: 'custom:constituencyCode', Value: extendedClaims.constituencyCode ?? user.constituencyCode ?? '' },
        { Name: 'custom:candidateId',      Value: extendedClaims.candidateId     ?? user.candidateId      ?? '' },
        { Name: 'custom:platformAdmin',    Value: isPlatformAdmin ? 'true' : 'false' },
      ];

      await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId:      this.userPoolId,
        Username:        user.email,
        UserAttributes:  attrs,
      }));

      this.logger.debug(`Synced Cognito claims for ${user.email}: role=${primaryRole} tenant=${user.tenantId}`);
    } catch (err) {
      // Non-fatal — log but never break login
      this.logger.warn(`Could not sync Cognito claims for ${user.email}: ${err instanceof Error ? err.message : err}`);
    }
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

      const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      if (!AccessToken || !RefreshToken || !ExpiresIn) {
        throw new UnauthorizedException('Invalid authentication result');
      }

      // Update last login timestamp
      await this.usersService.updateLastLogin(dto.email);

      // Look up user to include userId + roles in JWT payload
      const user = await this.usersService.findByEmailWithRoles(dto.email).catch(() => null);

      // Log authentication event
      await this.usersService.logAuthEvent({
        email: dto.email,
        eventType: 'login',
        ipAddress,
        userAgent,
        success: true,
      });

      // Sync campaign-scoped claims into Cognito custom attributes.
      // The Lambda authorizer reads these from the Cognito ID token.
      if (user) {
        await this.syncCognitoClaims(user as UserWithClaims);
      }

      // Return the Cognito ID token as the platform accessToken.
      // The Lambda authorizer at API Gateway validates this RS256 token
      // against the Cognito JWKS and extracts custom:* claims as context.
      // IdToken carries all custom attributes; AccessToken only has standard claims.
      const tokenToReturn = IdToken ?? AccessToken;

      return {
        accessToken:  tokenToReturn,
        refreshToken: RefreshToken,   // Cognito refresh token
        expiresIn:    ExpiresIn,
        tokenType:    'Bearer',
        // Also include user profile for frontend store hydration
        user: user ? {
          id:              user.id,
          email:           user.email,
          roles:           user.roles,
          tenantId:        user.tenantId,
        } : null,
      } as any;
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

      const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      await this.usersService.logAuthEvent({
        email: dto.email,
        eventType: 'mfa_success',
        ipAddress,
        userAgent,
        success: true,
      });

      // Look up user for claims sync
      const user = await this.usersService.findByEmailWithRoles(dto.email).catch(() => null);

      // Sync Cognito claims after MFA success
      if (user) {
        await this.syncCognitoClaims(user as UserWithClaims);
      }

      return {
        accessToken:  IdToken ?? AccessToken ?? '',
        refreshToken: RefreshToken ?? '',
        expiresIn:    ExpiresIn ?? 3600,
        tokenType:    'Bearer',
        user: user ? {
          id:      user.id,
          email:   user.email,
          roles:   user.roles,
          tenantId: user.tenantId,
        } : null,
      } as any;
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
