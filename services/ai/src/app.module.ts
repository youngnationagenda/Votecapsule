// ============================================================
// VoteCapsule — AI Service App Module
// services/ai/src/app.module.ts
// ============================================================
import { Module }           from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }    from '@nestjs/typeorm';

import { AiVerificationJob }   from './entities/ai-verification-job.entity';
import { AiAnomalyEvent }      from './entities/ai-anomaly-event.entity';
import { AiModule }            from './ai.module';

@Module({
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
        host:         config.get('DB_HOST', 'localhost'),
        port:         config.get<number>('DB_PORT', 5432),
        username:     config.get('DB_USER', 'votecapsule'),
        password:     config.get('DB_PASS', ''),
        database:     config.get('DB_NAME', 'votecapsule'),
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
})
export class AppModule {}
