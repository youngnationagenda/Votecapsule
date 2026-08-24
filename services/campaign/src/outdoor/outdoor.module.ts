// ============================================================
// VoteCapsule™ — Outdoor Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignOutdoorPlacement }  from './entities/campaign-outdoor-placement.entity';
import { CampaignOutdoorCondition }  from './entities/campaign-outdoor-condition.entity';
import { OutdoorService }            from './outdoor.service';
import { OutdoorController }         from './outdoor.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([CampaignOutdoorPlacement, CampaignOutdoorCondition])],
  controllers: [OutdoorController],
  providers:   [OutdoorService],
  exports:     [OutdoorService],
})
export class OutdoorModule {}
