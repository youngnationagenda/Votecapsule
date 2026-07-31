/**
 * Vote Capsule™ Identity Service — Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock AWS SDK Cognito client
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  InitiateAuthCommand: vi.fn(),
  RespondToAuthChallengeCommand: vi.fn(),
  ForgotPasswordCommand: vi.fn(),
  ConfirmForgotPasswordCommand: vi.fn(),
  GlobalSignOutCommand: vi.fn(),
  AuthFlowType: { USER_PASSWORD_AUTH: 'USER_PASSWORD_AUTH', REFRESH_TOKEN_AUTH: 'REFRESH_TOKEN_AUTH' },
  ChallengeNameType: { SOFTWARE_TOKEN_MFA: 'SOFTWARE_TOKEN_MFA' },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;

  beforeEach(async () => {
    const mockJwtService = { sign: vi.fn(), verify: vi.fn() };
    const mockConfigService = { get: vi.fn().mockReturnValue('test-value'), getOrThrow: vi.fn().mockReturnValue('test-value') };
    const mockUsersService = {
      findByEmail: vi.fn(),
      updateLastLogin: vi.fn(),
      logAuthEvent: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    jwtService = moduleRef.get<JwtService>(JwtService);
    usersService = moduleRef.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('should call logAuthEvent on login failure', async () => {
    const logSpy = vi.spyOn(usersService, 'logAuthEvent');

    // The Cognito client will throw since it's mocked
    await expect(
      authService.login({ email: 'test@test.com', password: 'wrong' }, '127.0.0.1', 'test-agent'),
    ).rejects.toThrow();

    expect(logSpy).toHaveBeenCalled();
  });
});
