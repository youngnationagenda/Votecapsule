// ============================================================
// VoteCapsule — Trust Service Root Module
// services/trust/src/app.module.ts
// ============================================================
import { HealthController } from './health.controller';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustModule }       from './trust.module';
import { TrustAnchor }       from './entities/trust-anchor.entity';
import { TrustVerification } from './entities/trust-verification.entity';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports:  [ConfigModule],
      inject:   [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:        config.get('DB_HOST',     'localhost'),
        port:        config.get<number>('DB_PORT', 5432),
        username:    config.get('DB_USER',     'votecapsule'),
        password:    config.get('DB_PASSWORD', ''),
        database:    config.get('DB_NAME',     'votecapsule'),
        schema:      config.get('DB_SCHEMA',   'public'),
        entities:    [TrustAnchor, TrustVerification],
        synchronize: false,
        ssl:         config.get('DB_SSL') === 'true'
                       ? { rejectUnauthorized: false }
                       : false,
        extra: {
          max: parseInt(config.get('DB_POOL_MAX', '10'), 10),
        },
      }),
    }),

    TrustModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
