// ============================================================
// VoteCapsule™ — Communications Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignSmsTemplate } from './entities/campaign-sms-template.entity';
import { CampaignSmsBatch }    from './entities/campaign-sms-batch.entity';
import { CampaignSmsMessage }  from './entities/campaign-sms-message.entity';
import { CampaignIncident }    from './entities/campaign-incident.entity';
import { CommunicationsController, WebhooksController } from './communications.controller';
import { CommunicationsService }       from './communications.service';
import { AfricasTalkingProvider }      from './providers/africas-talking.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignSmsTemplate,
      CampaignSmsBatch,
      CampaignSmsMessage,
      CampaignIncident,
    ]),
  ],
  controllers: [CommunicationsController, WebhooksController],
  providers:   [CommunicationsService, AfricasTalkingProvider],
  exports:     [CommunicationsService],
})
export class CommunicationsModule {}
