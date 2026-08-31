// ============================================================
// VoteCapsule™ — Campaign Media Controller
// ============================================================
import {
  Controller, Get, Post, Patch, Delete, Param, Body, Headers,
  Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('campaigns/:campaignId/media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  // ── POST /campaigns/:id/media/upload-url ─────────────────────
  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  async getUploadUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    const result = await this.service.getUploadUrl(c, t, u, dto);
    return {
      data: {
        upload_url: result.upload_url,
        media_id:   result.media_id,
        expires_in: 900,
      },
    };
  }

  // ── GET /campaigns/:id/media ──────────────────────────────────
  @Get()
  async list(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
    @Query('media_type') mediaType?: string,
    @Query('tags') tags?: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const tagList = tags ? tags.split(',') : undefined;
    const items = await this.service.list(c, t, { mediaType, tags: tagList });
    return { data: items };
  }

  // ── GET /campaigns/:id/media/:mid/url ─────────────────────────
  @Get(':mid/url')
  async getSignedUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getSignedUrl(mid, c, t);
    return { data: { url, expires_in: 3600 } };
  }

  // ── GET /campaigns/:id/media/:mid/thumbnail ───────────────────
  @Get(':mid/thumbnail')
  async getThumbnailUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getThumbnailUrl(mid, c, t);
    return { data: { url, expires_in: 3600 } };
  }

  // ── GET /campaigns/:id/media/:mid/preview ─────────────────────
  @Get(':mid/preview')
  async getPreviewUrl(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getPreviewUrl(mid, c, t);
    return { data: { url, expires_in: 3600 } };
  }

  // ── PATCH /campaigns/:id/media/:mid ──────────────────────────
  @Patch(':mid')
  async update(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const item = await this.service.update(mid, c, t, dto);
    return { data: item };
  }

  // ── DELETE /campaigns/:id/media/:mid ─────────────────────────
  @Delete(':mid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    await this.service.delete(mid, c, t);
  }

  // ── POST /campaigns/:id/media/:mid/publish ───────────────────
  // Task 3: Copy to votecapsule-public-assets for party_logo,
  //         candidate_portrait, candidate_symbol
  @Post(':mid/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    const result = await this.service.publish(mid, c, t);
    return { data: result };
  }
}
