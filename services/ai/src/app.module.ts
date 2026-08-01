// ============================================================
// VoteCapsule — AI Service App Module
// services/ai/src/app.module.ts
// ============================================================
import { HealthController } from './health.controller';
import { Module }           from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }    from '@nestjs/typeorm';

import { AiVerificationJob }   from './entities/ai-verification-job.entity';
import { AiAnomalyEvent }      from './entities/ai-anomaly-event.entity';
import { AiModule }            from './ai.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal:  true,
      envFilePath: ['.env.local', '.env'],
    }),

    // PostgreSQL connection (shared Aurora cluster, ai_* tables)
    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres' as const,
        host:         config.get<string>('DB_HOST', 'localhost'),
        port:         config.get<number>('DB_PORT', 5432),
        username:     config.get<string>('DB_USER', 'votecapsule'),
        password:     config.get<string>('DB_PASS', ''),
        database:     config.get<string>('DB_NAME', 'votecapsule'),
        entities:     [AiVerificationJob, AiAnomalyEvent],
        synchronize:  false,
        logging:      config.get('NODE_ENV') !== 'production',
        ssl:          config.get('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        extra: {
          max: parseInt(config.get('DB_POOL_MAX', '10'), 10),
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    AiModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
