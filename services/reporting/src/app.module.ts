// ============================================================
// VoteCapsule™ — Reporting Service App Module
// reporting-service/src/app.module.ts
// ============================================================
import { HealthController } from './health.controller';
import { Module }              from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { ReportingModule }     from './reporting.module';
import { ResultSnapshot }      from './entities/result-snapshot.entity';
import { Publication }         from './entities/publication.entity';
import { ExportLog }           from './entities/export-log.entity';
import { EvidenceCapsuleView } from './readers/evidence-capsule.reader';
import { AiJobView }           from './readers/ai-job.reader';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:     'postgres',
        host:     config.get('DB_HOST',     'localhost'),
        port:     config.get<number>('DB_PORT', 5432),
        database: config.get('DB_NAME',     'votecapsule'),
        username: config.get('DB_USER',     'vcadmin'),
        password: config.get('DB_PASSWORD', ''),
        ssl:      config.get('DB_SSL', 'false') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          ResultSnapshot,
          Publication,
          ExportLog,
          EvidenceCapsuleView,
          AiJobView,
        ],
        synchronize: false,
        logging:     config.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    ReportingModule,
  ],
})
export class AppModule {}
