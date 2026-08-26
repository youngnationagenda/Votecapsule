import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CampaignTeam } from './entities/campaign-team.entity';
import { CampaignTeamMember } from './entities/campaign-team-member.entity';
import { CampaignVolunteer } from './entities/campaign-volunteer.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignTeam, CampaignTeamMember, CampaignVolunteer]),
    HttpModule.register({ timeout: 5000, maxRedirects: 2 }),
    ConfigModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
