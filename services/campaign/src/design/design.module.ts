// ============================================================
// VoteCapsule™ — Design Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignDesignRequest }  from './entities/campaign-design-request.entity';
import { CampaignMockupTemplate } from './entities/campaign-mockup-template.entity';
import { DesignService }          from './design.service';
import { DesignController }       from './design.controller';
import { MockupService }          from './mockup-engine/mockup.service';
import { MediaModule }            from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignDesignRequest, CampaignMockupTemplate]),
    MediaModule,
  ],
  controllers: [DesignController],
  providers:   [DesignService, MockupService],
  exports:     [DesignService],
})
export class DesignModule {}
