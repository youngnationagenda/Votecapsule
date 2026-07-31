// ============================================================
// VoteCapsule™ — Election Module
// services/election/src/election.module.ts
// ============================================================
import { Module }         from '@nestjs/common';
import { ConfigModule }   from '@nestjs/config';
import { HttpModule }     from '@nestjs/axios';
import { ElectionController } from './election.controller';
import { ElectionService }    from './election.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({
      timeout:    10_000,  // 10 s upstream timeout
      maxRedirects: 3,
    }),
  ],
  controllers: [ElectionController],
  providers:   [ElectionService],
})
export class ElectionModule {}
