// ============================================================
// VoteCapsule™ — Candidate Service App Module
// candidate-service/src/app.module.ts
// ============================================================
import { Module }              from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { CandidateModule }     from './candidate.module';
import { Election }            from './entities/election.entity';
import { ElectionPosition }    from './entities/election-position.entity';
import { PoliticalParty }      from './entities/political-party.entity';
import { Candidate }           from './entities/candidate.entity';
import { CandidateStatusLog }  from './entities/candidate-status-log.entity';
import { CandidateBallotRef }  from './entities/candidate-ballot-ref.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:        config.get('DB_HOST',     'localhost'),
        port:        config.get<number>('DB_PORT', 5432),
        database:    config.get('DB_NAME',     'votecapsule'),
        username:    config.get('DB_USER',     'vcadmin'),
        password:    config.get('DB_PASSWORD', ''),
        ssl:         config.get('DB_SSL', 'false') === 'true'
                       ? { rejectUnauthorized: false }
                       : false,
        entities: [
          Election,
          ElectionPosition,
          PoliticalParty,
          Candidate,
          CandidateStatusLog,
          CandidateBallotRef,
        ],
        synchronize: false,  // Migrations only — never auto-sync in production
        logging:     config.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    CandidateModule,
  ],
})
export class AppModule {}
