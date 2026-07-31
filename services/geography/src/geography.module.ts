// ============================================================
// VoteCapsule NEC — Geography Service Module
// services/geography/src/geography.module.ts
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeographyController } from './geography.controller';
import { GeographyService }    from './geography.service';
import { County }              from './entities/county.entity';
import { Constituency }        from './entities/constituency.entity';
import { Ward }                from './entities/ward.entity';
import { RegistrationCentre }  from './entities/registration-centre.entity';
import { PollingStation }      from './entities/polling-station.entity';
import { ElectionVersion }     from './entities/election-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      County,
      Constituency,
      Ward,
      RegistrationCentre,
      PollingStation,
      ElectionVersion,
    ]),
  ],
  controllers: [GeographyController],
  providers:   [GeographyService],
  exports:     [GeographyService],  // exported so Evidence, AI, Reporting services can import
})
export class GeographyModule {}
