// ============================================================
// VoteCapsule™ — Media Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignMedia }     from './entities/campaign-media.entity';
import { MediaService }      from './media.service';
import { MediaUploadService } from './media.upload.service';
import { MediaController }   from './media.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([CampaignMedia])],
  controllers: [MediaController],
  providers:   [MediaService, MediaUploadService],
  exports:     [MediaService, MediaUploadService],
})
export class MediaModule {}
