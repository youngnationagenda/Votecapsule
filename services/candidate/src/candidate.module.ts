// ============================================================
// VoteCapsule™ — Candidate Module
// candidate-service/src/candidate.module.ts
// ============================================================
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule }    from '@nestjs/axios';
import { ConfigModule }  from '@nestjs/config';

import { CandidateController }    from './candidate.controller';
import { CandidateService }       from './candidate.service';
import { Election }               from './entities/election.entity';
import { ElectionPosition }       from './entities/election-position.entity';
import { PoliticalParty }         from './entities/political-party.entity';
import { Candidate }              from './entities/candidate.entity';
import { CandidateStatusLog }     from './entities/candidate-status-log.entity';
import { CandidateBallotRef }     from './entities/candidate-ballot-ref.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 5000 }),
    TypeOrmModule.forFeature([
      Election,
      ElectionPosition,
      PoliticalParty,
      Candidate,
      CandidateStatusLog,
      CandidateBallotRef,
    ]),
  ],
  controllers: [CandidateController],
  providers:   [CandidateService],
  exports:     [CandidateService],
})
export class CandidateModule {}
