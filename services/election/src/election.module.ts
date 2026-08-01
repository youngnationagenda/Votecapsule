// ============================================================
// VoteCapsule™ — Election Module
// services/election/src/election.module.ts
// ============================================================
import { Module }         from '@nestjs/common';
import { ConfigModule }   from '@nestjs/config';
import { HttpModule }     from '@nestjs/axios';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor }     from './common/audit.interceptor';
import { SubscriptionGuard }    from './common/subscription.guard';
import { ElectionController }   from './election.controller';
import { ElectionService }      from './election.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({
      timeout:    10_000,  // 10 s upstream timeout
      maxRedirects: 3,
    }),
  ],
  controllers: [ElectionController],
  providers: [
    ElectionService,
    SubscriptionGuard,           // Checks active subscription on POST /elections, POST /candidates/register
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class ElectionModule {}
