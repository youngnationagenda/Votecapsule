/**
 * Vote Capsule™ Identity Service — Root Application Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { InvitationsModule } from './invitations/invitations.module';
import { DevicesModule } from './devices/devices.module';
import { DatabaseModule } from './database/database.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({
  controllers: [HealthController],
  imports: [
    // Configuration — environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting — protect all endpoints
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second
        limit: 10,    // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 seconds
        limit: 50,    // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minute
        limit: 200,   // 200 requests per minute
      },
    ]),

    // Database connection
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    RolesModule,
    InvitationsModule,
    DevicesModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
