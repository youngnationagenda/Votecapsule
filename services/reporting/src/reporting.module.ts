// ============================================================
// VoteCapsule™ — Reporting Module
// reporting-service/src/reporting.module.ts
// ============================================================
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule }  from '@nestjs/config';

import { ReportingController }       from './reporting.controller';
import { PublicReportingController } from './public-reporting.controller';
import { ReportingService }          from './reporting.service';
import { ResultSnapshot }       from './entities/result-snapshot.entity';
import { Publication }          from './entities/publication.entity';
import { ExportLog }            from './entities/export-log.entity';

// Read-only views onto shared tables — registered so TypeORM can query them
import { EvidenceCapsuleView }  from './readers/evidence-capsule.reader';
import { AiJobView }            from './readers/ai-job.reader';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ResultSnapshot,
      Publication,
      ExportLog,
      EvidenceCapsuleView,  // read-only; Reporting Service never writes to evidence_capsules
      AiJobView,            // read-only; Reporting Service never writes to ai_verification_jobs
    ]),
  ],
  controllers: [ReportingController, PublicReportingController],
  providers:   [ReportingService],
  exports:     [ReportingService],
})
export class ReportingModule {}
