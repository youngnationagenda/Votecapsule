/**
 * Vote Capsule™ Identity Service — SessionService Unit Tests
 *
 * Tests Redis-backed session management, token blacklisting,
 * and login attempt tracking with fail-open semantics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import type { SessionMetadata } from './interfaces';

// Mock ioredis
const mockPipeline = {
  set: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  incr: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  sadd: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  srem: vi.fn().mockResolvedValue(1),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  pipeline: vi.fn(() => ({ ...mockPipeline, exec: vi.fn().mockResolvedValue([]) })),
  quit: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis),
}));

describe('SessionService', () => {
  let service: SessionService;

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        SESSION_TTL_SECONDS: 3600,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset pipeline mock
    mockPipeline.exec.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  // ─── Session Management ───────────────────────────────────────────────

  describe('storeSession', () => {
    it('should store session data with TTL via pipeline', async () => {
      const userId = 'user-001';
      const sessionId = 'session-abc-123';
      const metadata: SessionMetadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        tenantId: 'tenant-001',
      };

      await service.storeSession(userId, sessionId, metadata);

      // Pipeline should have been called
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return parsed session data when found', async () => {
      const sessionData = {
        userId: 'user-001',
        sessionId: 'session-abc',
        metadata: { ipAddress: '1.2.3.4', userAgent: 'Test', tenantId: 'tenant-001' },
        createdAt: '2027-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T01:00:00.000Z',
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      const result = await service.getSession('session-abc');

      expect(result).toEqual(sessionData);
      expect(mockRedis.get).toHaveBeenCalledWith('vc:session:session-abc');
    });

    it('should return null when session not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.getSession('nonexistent');

      expect(result).toBeNull();
    });

    it('should fail-open and return null on Redis error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.getSession('session-abc');

      expect(result).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should remove the session key and remove from user session set', async () => {
      const sessionData = {
        userId: 'user-001',
        sessionId: 'session-to-remove',
        metadata: { ipAddress: '1.2.3.4', userAgent: 'Test', tenantId: 'tenant-001' },
        createdAt: '2027-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T01:00:00.000Z',
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      await service.invalidateSession('session-to-remove');

      expect(mockRedis.get).toHaveBeenCalledWith('vc:session:session-to-remove');
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should delete all session keys and the user session set', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['session-1', 'session-2', 'session-3']);

      await service.invalidateAllUserSessions('user-001');

      expect(mockRedis.smembers).toHaveBeenCalledWith('vc:user_sessions:user-001');
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should do nothing when user has no active sessions', async () => {
      mockRedis.smembers.mockResolvedValueOnce([]);

      await service.invalidateAllUserSessions('user-no-sessions');

      // pipeline should not be called for empty list
      expect(mockRedis.smembers).toHaveBeenCalledWith('vc:user_sessions:user-no-sessions');
    });
  });

  // ─── Token Blacklisting ───────────────────────────────────────────────

  describe('blacklistToken', () => {
    it('should blacklist a token with correct TTL (remaining lifetime)', async () => {
      const futureDate = new Date(Date.now() + 1800 * 1000); // 30 minutes from now

      await service.blacklistToken('jti-abc-123', futureDate);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'vc:blacklist:jti-abc-123',
        '1',
        'EX',
        expect.any(Number),
      );

      // TTL should be approximately 1800 seconds
      const ttlArg = mockRedis.set.mock.calls[0][3] as number;
      expect(ttlArg).toBeGreaterThan(1795);
      expect(ttlArg).toBeLessThanOrEqual(1800);
    });

    it('should not blacklist an already-expired token', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      await service.blacklistToken('jti-expired', pastDate);

      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await service.isTokenBlacklisted('jti-blacklisted');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('vc:blacklist:jti-blacklisted');
    });

    it('should return false when token is not blacklisted', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);

      const result = await service.isTokenBlacklisted('jti-valid');

      expect(result).toBe(false);
    });

    it('should fail-open and return false on Redis error', async () => {
      mockRedis.exists.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.isTokenBlacklisted('jti-unknown');

      expect(result).toBe(false);
    });
  });

  // ─── Login Attempt Tracking ───────────────────────────────────────────

  describe('recordLoginAttempt', () => {
    it('should increment counter on failed attempt via pipeline', async () => {
      await service.recordLoginAttempt('attacker@evil.com', false, '10.0.0.1');

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should clear counter on successful attempt', async () => {
      await service.recordLoginAttempt('user@votecapsule.co.ke', true, '10.0.0.1');

      expect(mockRedis.del).toHaveBeenCalledWith('vc:login_attempts:user@votecapsule.co.ke');
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should return parsed count when attempts exist', async () => {
      mockRedis.get.mockResolvedValueOnce('5');

      const result = await service.getFailedLoginAttempts('attacker@evil.com');

      expect(result).toBe(5);
      expect(mockRedis.get).toHaveBeenCalledWith('vc:login_attempts:attacker@evil.com');
    });

    it('should return 0 when no attempts recorded', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.getFailedLoginAttempts('clean@user.com');

      expect(result).toBe(0);
    });

    it('should fail-open and return 0 on Redis error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.getFailedLoginAttempts('any@user.com');

      expect(result).toBe(0);
    });
  });
});
