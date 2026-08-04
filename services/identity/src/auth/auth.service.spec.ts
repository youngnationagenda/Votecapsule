/**
 * Vote Capsule™ Identity Service — AuthService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock the entire AWS SDK module
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  InitiateAuthCommand: vi.fn().mockImplementation((input) => ({ input })),
  RespondToAuthChallengeCommand: vi.fn().mockImplementation((input) => ({ input })),
  ForgotPasswordCommand: vi.fn().mockImplementation((input) => ({ input })),
  ConfirmForgotPasswordCommand: vi.fn().mockImplementation((input) => ({ input })),
  GlobalSignOutCommand: vi.fn().mockImplementation((input) => ({ input })),
  AuthFlowType: {
    USER_PASSWORD_AUTH: 'USER_PASSWORD_AUTH',
    REFRESH_TOKEN_AUTH: 'REFRESH_TOKEN_AUTH',
  },
  ChallengeNameType: {
    SOFTWARE_TOKEN_MFA: 'SOFTWARE_TOKEN_MFA',
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    updateLastLogin: ReturnType<typeof vi.fn>;
    logAuthEvent: ReturnType<typeof vi.fn>;
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        AWS_REGION: 'us-east-1',
        COGNITO_CLIENT_ID: 'test-client-id',
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: vi.fn((key: string) => {
      if (key === 'COGNITO_CLIENT_ID') return 'test-client-id';
      throw new Error(`Missing config: ${key}`);
    }),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('signed-token'),
    verify: vi.fn(),
  };

  beforeEach(async () => {
    mockSend.mockReset();

    usersService = {
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
      logAuthEvent: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const loginDto = { email: 'agent@votecapsule.co.ke', password: 'SecureP@ss123' };
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 Test';

    it('should return access + refresh tokens on successful login', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'cognito-access-token',
          RefreshToken: 'cognito-refresh-token',
          ExpiresIn: 3600,
          IdToken: 'cognito-id-token',
        },
      });

      const result = await service.login(loginDto, ipAddress, userAgent);

      expect(result).toEqual({
        accessToken: 'cognito-access-token',
        refreshToken: 'cognito-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          email: loginDto.email,
          eventType: 'login',
          ipAddress,
          userAgent,
          success: true,
        }),
      );
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      mockSend.mockRejectedValueOnce(new Error('NotAuthorizedException'));

      await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(usersService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          email: loginDto.email,
          eventType: 'login',
          success: false,
          failureReason: 'NotAuthorizedException',
        }),
      );
    });

    it('should return MFA challenge when SOFTWARE_TOKEN_MFA is required', async () => {
      mockSend.mockResolvedValueOnce({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        Session: 'mfa-session-id-123',
      });

      const result = await service.login(loginDto, ipAddress, userAgent);

      expect(result).toEqual({
        challengeName: 'SOFTWARE_TOKEN_MFA',
        session: 'mfa-session-id-123',
      });
      // Should not update last login for MFA challenge
      expect(usersService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when AuthenticationResult is missing', async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when tokens are incomplete', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'token',
          // Missing RefreshToken and ExpiresIn
        },
      });

      await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    const refreshDto = { refreshToken: 'valid-refresh-token' };

    it('should return new tokens with valid refresh token', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          RefreshToken: 'new-refresh-token',
          ExpiresIn: 3600,
        },
      });

      const result = await service.refresh(refreshDto);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
    });

    it('should fall back to original refresh token when new one is absent', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          RefreshToken: undefined,
          ExpiresIn: 3600,
        },
      });

      const result = await service.refresh(refreshDto);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'valid-refresh-token', // falls back to dto.refreshToken
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockSend.mockRejectedValueOnce(new Error('NotAuthorizedException'));

      await expect(service.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when AccessToken is missing from response', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {},
      });

      await expect(service.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout (globalSignOut)', () => {
    it('should call Cognito GlobalSignOut and log auth event', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.logout('access-token-123', 'agent@votecapsule.co.ke');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { AccessToken: 'access-token-123' },
        }),
      );
      expect(usersService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'agent@votecapsule.co.ke',
          eventType: 'logout',
          success: true,
        }),
      );
    });

    it('should not throw when Cognito sign-out fails (graceful degradation)', async () => {
      mockSend.mockRejectedValueOnce(new Error('InternalErrorException'));

      // Should not throw
      await expect(
        service.logout('invalid-token', 'agent@votecapsule.co.ke'),
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyMfa', () => {
    const mfaDto = {
      email: 'agent@votecapsule.co.ke',
      session: 'mfa-session-id',
      mfaCode: '123456',
    };
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    it('should return tokens on successful MFA verification', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'mfa-access-token',
          RefreshToken: 'mfa-refresh-token',
          ExpiresIn: 3600,
        },
      });

      const result = await service.verifyMfa(mfaDto, ipAddress, userAgent);

      expect(result).toEqual({
        accessToken: 'mfa-access-token',
        refreshToken: 'mfa-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      expect(usersService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'mfa_success',
          success: true,
        }),
      );
    });

    it('should throw UnauthorizedException on invalid MFA code', async () => {
      mockSend.mockRejectedValueOnce(new Error('CodeMismatchException'));

      await expect(service.verifyMfa(mfaDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'mfa_failure',
          success: false,
        }),
      );
    });
  });
});
