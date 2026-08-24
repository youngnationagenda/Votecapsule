// ============================================================
// VoteCapsule™ — Campaign Service App Module
// campaign-service/src/app.module.ts
// Port: 3016
// Phase 14B: Materials, Outdoor, Media, Design, Logistics modules added
// Africa's Talking SMS wired | Role Guard registered globally
// ============================================================
import { Module }           from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

import { HealthController } from './health.controller';
import { AuditInterceptor } from './common/audit.interceptor';
import { CampaignRoleGuard } from './common/campaign-role.guard';

// ── Modules ──────────────────────────────────────────────────
import { CampaignModule }        from './campaign/campaign.module';
import { EventsModule }          from './events/events.module';
import { TasksModule }           from './tasks/tasks.module';
import { TeamsModule }           from './teams/teams.module';
import { BudgetModule }          from './budget/budget.module';
import { CommunicationsModule }  from './communications/communications.module';
import { MaterialsModule }       from './materials/materials.module';
import { OutdoorModule }         from './outdoor/outdoor.module';
import { MediaModule }           from './media/media.module';
import { DesignModule }          from './design/design.module';
import { LogisticsModule }       from './logistics/logistics.module';

// ── Entities: existing ───────────────────────────────────────
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
import { CampaignSmsMessage }      from './communications/entities/campaign-sms-message.entity';
import { CampaignIncident }        from './communications/entities/campaign-incident.entity';

// ── Entities: Phase 14B ──────────────────────────────────────
import { CampaignMaterialCategory }     from './materials/entities/campaign-material-category.entity';
import { CampaignMaterialType }         from './materials/entities/campaign-material-type.entity';
import { CampaignMaterialOrder }        from './materials/entities/campaign-material-order.entity';
import { CampaignSupplier }             from './materials/entities/campaign-supplier.entity';
import { CampaignSupplierProduct }      from './materials/entities/campaign-supplier-product.entity';
import { CampaignMaterialInventory }    from './materials/entities/campaign-material-inventory.entity';
import { CampaignMaterialDistribution } from './materials/entities/campaign-material-distribution.entity';
import { CampaignOutdoorPlacement }     from './outdoor/entities/campaign-outdoor-placement.entity';
import { CampaignOutdoorCondition }     from './outdoor/entities/campaign-outdoor-condition.entity';
import { CampaignMedia }                from './media/entities/campaign-media.entity';
import { CampaignMockupTemplate }       from './design/entities/campaign-mockup-template.entity';
import { CampaignDesignRequest }        from './design/entities/campaign-design-request.entity';
import { CampaignVehicle }              from './logistics/entities/campaign-vehicle.entity';
import { CampaignVehicleTrip }          from './logistics/entities/campaign-vehicle-trip.entity';
import { CampaignEquipment }            from './logistics/entities/campaign-equipment.entity';
import { CampaignEquipmentLog }         from './logistics/entities/campaign-equipment-log.entity';

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
          // Existing entities
          Campaign,
          CampaignEvent, CampaignEventCapsule,
          CampaignTask,
          CampaignTeam, CampaignTeamMember, CampaignVolunteer,
          CampaignBudget, CampaignBudgetCategory, CampaignExpense, CampaignContribution,
          CampaignSmsTemplate, CampaignSmsBatch, CampaignSmsMessage,
          CampaignIncident,
          // Phase 14B entities
          CampaignMaterialCategory, CampaignMaterialType, CampaignMaterialOrder,
          CampaignSupplier, CampaignSupplierProduct,
          CampaignMaterialInventory, CampaignMaterialDistribution,
          CampaignOutdoorPlacement, CampaignOutdoorCondition,
          CampaignMedia,
          CampaignMockupTemplate, CampaignDesignRequest,
          CampaignVehicle, CampaignVehicleTrip,
          CampaignEquipment, CampaignEquipmentLog,
        ],
        synchronize: false,
        logging:     config.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    // Existing modules
    CampaignModule,
    EventsModule,
    TasksModule,
    TeamsModule,
    BudgetModule,
    CommunicationsModule,

    // Phase 14B modules
    MaterialsModule,
    OutdoorModule,
    MediaModule,
    DesignModule,
    LogisticsModule,
  ],
  providers: [
    // Audit every request
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Role guard — enforces x-user-role on every campaign endpoint
    {
      provide:  APP_GUARD,
      useClass: CampaignRoleGuard,
    },
  ],
})
export class AppModule {}
