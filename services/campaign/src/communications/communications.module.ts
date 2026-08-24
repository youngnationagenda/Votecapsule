import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignSmsTemplate } from './entities/campaign-sms-template.entity';
import { CampaignSmsBatch }    from './entities/campaign-sms-batch.entity';
import { CampaignIncident }    from './entities/campaign-incident.entity';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService }    from './communications.service';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignSmsTemplate, CampaignSmsBatch, CampaignIncident])],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
