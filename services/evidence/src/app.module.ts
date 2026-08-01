// ============================================================
// VoteCapsule — Evidence Service Root Module
// services/evidence/src/app.module.ts
// ============================================================
import { HealthController } from './health.controller';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenceModule }            from './evidence.module';
import { EvidenceCapsule }           from './entities/evidence-capsule.entity';
import { EvidenceImage }             from './entities/evidence-image.entity';
import { EvidenceHash }              from './entities/evidence-hash.entity';
import { EvidenceChainOfCustody }    from './entities/evidence-chain-of-custody.entity';

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
        entities:    [EvidenceCapsule, EvidenceImage, EvidenceHash, EvidenceChainOfCustody],
        // Migrations managed separately via migration SQL files
        synchronize: false,
        ssl:         config.get('DB_SSL') === 'true'
                       ? { rejectUnauthorized: false }
                       : false,
        // Connection pool — sized for Lambda / ECS
        extra: {
          max: parseInt(config.get('DB_POOL_MAX', '10'), 10),
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    EvidenceModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
