// ============================================================
// VoteCapsule™ — Logistics Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignVehicle }      from './entities/campaign-vehicle.entity';
import { CampaignVehicleTrip }  from './entities/campaign-vehicle-trip.entity';
import { CampaignEquipment }    from './entities/campaign-equipment.entity';
import { CampaignEquipmentLog } from './entities/campaign-equipment-log.entity';
import { LogisticsService }     from './logistics.service';
import { LogisticsController }  from './logistics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignVehicle,
      CampaignVehicleTrip,
      CampaignEquipment,
      CampaignEquipmentLog,
    ]),
  ],
  controllers: [LogisticsController],
  providers:   [LogisticsService],
  exports:     [LogisticsService],
})
export class LogisticsModule {}
