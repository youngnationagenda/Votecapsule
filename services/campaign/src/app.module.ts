// ============================================================
// VoteCapsule™ — Campaign Service App Module
// campaign-service/src/app.module.ts
// Port: 3016
// ============================================================
import { Module }           from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { APP_INTERCEPTOR }  from '@nestjs/core';

import { HealthController } from './health.controller';
import { AuditInterceptor } from './common/audit.interceptor';

import { CampaignModule }        from './campaign/campaign.module';
import { EventsModule }          from './events/events.module';
import { TasksModule }           from './tasks/tasks.module';
import { TeamsModule }           from './teams/teams.module';
import { BudgetModule }          from './budget/budget.module';
import { CommunicationsModule }  from './communications/communications.module';

// Entities
import { Campaign }                from './campaign/entities/campaign.entity';
import { CampaignEvent }           from './events/entities/campaign-event.entity';
import { CampaignEventCapsule }    from './events/entities/campaign-event-capsule.entity';
import { CampaignTask }            from './tasks/entities/campaign-task.entity';
import { CampaignTeam }            from './teams/entities/campaign-team.entity';
import { CampaignTeamMember }      from './teams/entities/campaign-team-member.entity';
import { CampaignVolunteer }       from './teams/entities/campaign-volunteer.entity';
import { CampaignBudget }          from './budget/entities/campaign-budget.entity';
import { CampaignBudgetCategory }  from './budget/entities/campaign-budget-category.entity';
import { CampaignExpense }         from './budget/entities/campaign-expense.entity';
import { CampaignContribution }    from './budget/entities/campaign-contribution.entity';
import { CampaignSmsTemplate }     from './communications/entities/campaign-sms-template.entity';
import { CampaignSmsBatch }        from './communications/entities/campaign-sms-batch.entity';
import { CampaignIncident }        from './communications/entities/campaign-incident.entity';

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
        ssl:      config.get('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [
          Campaign,
          CampaignEvent, CampaignEventCapsule,
          CampaignTask,
          CampaignTeam, CampaignTeamMember, CampaignVolunteer,
          CampaignBudget, CampaignBudgetCategory, CampaignExpense, CampaignContribution,
          CampaignSmsTemplate, CampaignSmsBatch,
          CampaignIncident,
        ],
        synchronize: false,
        logging:     config.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    CampaignModule,
    EventsModule,
    TasksModule,
    TeamsModule,
    BudgetModule,
    CommunicationsModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
