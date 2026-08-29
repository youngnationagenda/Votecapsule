// ============================================================
// VoteCapsule™ — Design Module
// ============================================================
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule }  from '@nestjs/config';
import { CampaignDesignRequest }  from './entities/campaign-design-request.entity';
import { CampaignMockupTemplate } from './entities/campaign-mockup-template.entity';
import { DesignService }          from './design.service';
import { DesignController }       from './design.controller';
import { MockupService }          from './mockup-engine/mockup.service';
import { MediaModule }            from '../media/media.module';
import { BedrockImageService }    from './bedrock-image.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignDesignRequest, CampaignMockupTemplate]),
    ConfigModule,
    MediaModule,
  ],
  controllers: [DesignController],
  providers:   [DesignService, MockupService, BedrockImageService],
  exports:     [DesignService, BedrockImageService],
})
export class DesignModule {}
