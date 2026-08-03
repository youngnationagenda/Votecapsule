/**
 * Vote Capsule™ Identity Service — Redis Session Service
 *
 * Manages user sessions, token blacklisting, and login attempt tracking
 * via ElastiCache Redis. Fail-open on read errors (logs warning);
 * write errors are propagated.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SessionData, SessionMetadata } from './interfaces';

/** Redis key prefixes */
const KEY = {
  SESSION: 'vc:session:',
  USER_SESSIONS: 'vc:user_sessions:',
  BLACKLIST: 'vc:blacklist:',
  LOGIN_ATTEMPTS: 'vc:login_attempts:',
} as const;

/** Default session TTL: 1 hour (seconds) */
const DEFAULT_SESSION_TTL = 3600;

/** Login-attempt window: 15 minutes (seconds) */
const LOGIN_ATTEMPT_WINDOW = 900;

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis: Redis;
  private readonly sessionTtl: number;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    this.sessionTtl = this.config.get<number>(
      'SESSION_TTL_SECONDS',
      DEFAULT_SESSION_TTL,
    );

    this.redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // ─── Session Management ─────────────────────────────────────────────

  /**
   * Store a new session in Redis.
   * Creates both the session hash and adds the sessionId to the user's session set.
   */
  async storeSession(
    userId: string,
    sessionId: string,
    metadata: SessionMetadata,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtl * 1000);

    const sessionData: SessionData = {
      userId,
      sessionId,
      metadata,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const pipeline = this.redis.pipeline();

    // Store session data with TTL
    pipeline.set(
      `${KEY.SESSION}${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      this.sessionTtl,
    );

    // Add sessionId to user's session set (with same TTL for cleanup)
    pipeline.sadd(`${KEY.USER_SESSIONS}${userId}`, sessionId);
    pipeline.expire(`${KEY.USER_SESSIONS}${userId}`, this.sessionTtl);

    await pipeline.exec();
    this.logger.debug(`Session stored: ${sessionId} for user ${userId}`);
  }

  /**
   * Retrieve session data by sessionId.
   * Fail-open: returns null if Redis is unavailable.
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const raw = await this.redis.get(`${KEY.SESSION}${sessionId}`);
      if (!raw) return null;
      return JSON.parse(raw) as SessionData;
    } catch (err) {
      this.logger.warn(
        `Failed to read session ${sessionId}: ${(err as Error).message}. Failing open.`,
      );
      return null;
    }
  }

  /**
   * Invalidate a single session (logout).
   */
  async invalidateSession(sessionId: string): Promise<void> {
    // Retrieve session to get userId for set cleanup
    const session = await this.getSession(sessionId);

    const pipeline = this.redis.pipeline();
    pipeline.del(`${KEY.SESSION}${sessionId}`);

    if (session) {
      pipeline.srem(`${KEY.USER_SESSIONS}${session.userId}`, sessionId);
    }

    await pipeline.exec();
    this.logger.debug(`Session invalidated: ${sessionId}`);
  }

  /**
   * Invalidate ALL sessions for a user (force-logout from all devices).
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(
      `${KEY.USER_SESSIONS}${userId}`,
    );

    if (sessionIds.length === 0) return;

    const pipeline = this.redis.pipeline();

    for (const sid of sessionIds) {
      pipeline.del(`${KEY.SESSION}${sid}`);
    }
    pipeline.del(`${KEY.USER_SESSIONS}${userId}`);

    await pipeline.exec();
    this.logger.log(
      `All sessions invalidated for user ${userId} (${sessionIds.length} sessions)`,
    );
  }

  // ─── Token Blacklisting ─────────────────────────────────────────────

  /**
   * Blacklist a JWT by its jti claim. TTL = remaining token lifetime.
   */
  async blacklistToken(jti: string, expiresAt: Date): Promise<void> {
    const ttl = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    );

    if (ttl <= 0) return; // already expired, no need to blacklist

    await this.redis.set(`${KEY.BLACKLIST}${jti}`, '1', 'EX', ttl);
    this.logger.debug(`Token blacklisted: ${jti} (TTL ${ttl}s)`);
  }

  /**
   * Check if a token is blacklisted.
   * Fail-open: returns false if Redis is unavailable (token considered valid).
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(`${KEY.BLACKLIST}${jti}`);
      return result === 1;
    } catch (err) {
      this.logger.warn(
        `Failed to check blacklist for ${jti}: ${(err as Error).message}. Failing open.`,
      );
      return false;
    }
  }

  // ─── Login Attempt Tracking ─────────────────────────────────────────

  /**
   * Record a login attempt. Failed attempts increment a counter with a 15-min TTL.
   * Successful attempts clear the counter.
   */
  async recordLoginAttempt(
    email: string,
    success: boolean,
    ip: string,
  ): Promise<void> {
    const key = `${KEY.LOGIN_ATTEMPTS}${email}`;

    if (success) {
      await this.redis.del(key);
      this.logger.debug(`Login success for ${email} from ${ip} — counter cleared`);
      return;
    }

    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, LOGIN_ATTEMPT_WINDOW);
    await pipeline.exec();

    this.logger.debug(`Failed login attempt recorded for ${email} from ${ip}`);
  }

  /**
   * Get the number of failed login attempts within the current window.
   * Fail-open: returns 0 if Redis is unavailable (allows login).
   */
  async getFailedLoginAttempts(email: string): Promise<number> {
    try {
      const count = await this.redis.get(`${KEY.LOGIN_ATTEMPTS}${email}`);
      return count ? parseInt(count, 10) : 0;
    } catch (err) {
      this.logger.warn(
        `Failed to read login attempts for ${email}: ${(err as Error).message}. Failing open.`,
      );
      return 0;
    }
  }

  /**
   * Clear failed login attempts (e.g., after password reset or admin unlock).
   */
  async clearFailedLoginAttempts(email: string): Promise<void> {
    await this.redis.del(`${KEY.LOGIN_ATTEMPTS}${email}`);
    this.logger.debug(`Login attempts cleared for ${email}`);
  }
}
