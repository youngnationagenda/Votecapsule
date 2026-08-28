// ============================================================
// VoteCapsule™ — Outdoor Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CampaignOutdoorPlacement }  from './entities/campaign-outdoor-placement.entity';
import { CampaignOutdoorCondition }  from './entities/campaign-outdoor-condition.entity';
import { OutdoorService }            from './outdoor.service';
import { OutdoorController }         from './outdoor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignOutdoorPlacement, CampaignOutdoorCondition]),
    HttpModule.register({ timeout: 5000, maxRedirects: 2 }),
    ConfigModule,
  ],
  controllers: [OutdoorController],
  providers:   [OutdoorService],
  exports:     [OutdoorService],
})
export class OutdoorModule {}
