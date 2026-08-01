// ============================================================
// VoteCapsule — Audit Service Root Module
// services/audit/src/app.module.ts
// ============================================================
import { HealthController } from './health.controller';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './audit.module';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { AccessLog } from './entities/access-log.entity';
import { ComplianceReport } from './entities/compliance-report.entity';
import { SystemLog } from './entities/system-log.entity';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'vcadmin'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'votecapsule'),
        entities: [AuditLog, SecurityEvent, AccessLog, ComplianceReport, SystemLog],
        // Migrations managed separately via migration SQL files
        synchronize: false,
        ssl: config.get('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        // Connection pool — sized for Lambda / ECS
        extra: {
          max: parseInt(config.get('DB_POOL_MAX', '10'), 10),
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    AuditModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
