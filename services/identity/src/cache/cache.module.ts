/**
 * Vote Capsule™ Identity Service — Cache Module
 *
 * Global Redis-backed session/cache module using ioredis directly.
 * Provides SessionService for session management, token blacklisting,
 * and login-attempt rate limiting.
 */

import { Global, Module } from '@nestjs/common';
import { SessionService } from './session.service';

@Global()
@Module({
  providers: [SessionService],
  exports: [SessionService],
})
export class CacheModule {}
