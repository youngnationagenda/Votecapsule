// ============================================================
// VoteCapsule — Workflow Service App Module
// services/workflow/src/app.module.ts
// ============================================================
import { HealthController } from './health.controller';
import { Module }           from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }    from '@nestjs/typeorm';

import { WorkflowExecution }  from './entities/workflow-execution.entity';
import { WorkflowStepEvent }  from './entities/workflow-step-event.entity';
import { WorkflowEscalation } from './entities/workflow-escalation.entity';
import { WorkflowModule }     from './workflow.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres' as const,
        host:         config.get<string>('DB_HOST',     'localhost'),
        port:         config.get<number>('DB_PORT',     5432),
        username:     config.get<string>('DB_USER',     'votecapsule'),
        password:     config.get<string>('DB_PASS',     ''),
        database:     config.get<string>('DB_NAME',     'votecapsule'),
        entities:     [WorkflowExecution, WorkflowStepEvent, WorkflowEscalation],
        synchronize:  false,
        logging:      config.get<string>('NODE_ENV') !== 'production',
        ssl:          config.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        extra: {
          max: parseInt(config.get<string>('DB_POOL_MAX', '10'), 10),
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    WorkflowModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
