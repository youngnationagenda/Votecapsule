// ============================================================
// VoteCapsule™ — Campaign Media Controller
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('campaigns/:campaignId/media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  getUploadUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.getUploadUrl(c, t, u, dto);
  }

  @Get()
  list(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('media_type') mediaType?: string,
    @Query('tags') tags?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const tagList = tags ? tags.split(',') : undefined;
    return this.service.list(c, t, { mediaType, tags: tagList });
  }

  @Get(':mid/url')
  async getSignedUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getSignedUrl(mid, c, t);
    return { url };
  }

  @Get(':mid/thumbnail')
  async getThumbnailUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getThumbnailUrl(mid, c, t);
    return { url };
  }

  @Get(':mid/preview')
  async getPreviewUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getPreviewUrl(mid, c, t);
    return { url };
  }

  @Patch(':mid')
  update(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(mid, c, t, dto);
  }
}
