// ============================================================
// VoteCapsule — AI Module
// services/ai/src/ai.module.ts
// ============================================================
import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { HttpModule }      from '@nestjs/axios';
import { ConfigModule }    from '@nestjs/config';

import { AiVerificationJob }    from './entities/ai-verification-job.entity';
import { AiAnomalyEvent }       from './entities/ai-anomaly-event.entity';
import { AiService }            from './ai.service';
import { AiController }         from './ai.controller';
import { TextractProcessor }    from './processors/textract.processor';
import { NecValidatorProcessor } from './processors/nec-validator.processor';
import { ConfidenceProcessor }  from './processors/confidence.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiVerificationJob, AiAnomalyEvent]),
    HttpModule.register({
      timeout:          5000,
      maxRedirects:     3,
      validateStatus:   (s: number) => s < 500,
    }),
    ConfigModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    TextractProcessor,
    NecValidatorProcessor,
    ConfidenceProcessor,
  ],
  exports: [AiService],
})
export class AiModule {}
