import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEvent } from './entities/campaign-event.entity';
import { CampaignEventCapsule } from './entities/campaign-event-capsule.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignEvent, CampaignEventCapsule])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
