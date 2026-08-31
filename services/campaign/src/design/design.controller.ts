// ============================================================
// VoteCapsule™ — Campaign Design Controller
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Headers,
  HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { DesignService }        from './design.service';
import { BedrockImageService }  from './bedrock-image.service';
import { MediaService }         from '../media/media.service';

@Controller()
export class DesignController {
  constructor(
    private readonly service:        DesignService,
    private readonly bedrockImages:  BedrockImageService,
    private readonly mediaService:   MediaService,
  ) {}

  // ── Mockup templates (global, by material type) ──────────────

  @Get('mockup-templates/:materialTypeId')
  getTemplates(@Param('materialTypeId', ParseUUIDPipe) id: string) {
    return this.service.getTemplatesForType(id);
  }

  // ── Design requests (campaign-scoped) ────────────────────────

  @Get('campaigns/:campaignId/designs')
  list(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.list(c, t);
  }

  @Post('campaigns/:campaignId/designs')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Body() dto: any,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.create(c, dto, t, u);
  }

  @Post('campaigns/:campaignId/designs/:did/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  generate(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.generate(did, c, t);
  }

  @Get('campaigns/:campaignId/designs/:did/preview')
  async getPreview(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    const url = await this.service.getPreviewUrl(did, c, t);
    return { url };
  }

  @Patch('campaigns/:campaignId/designs/:did/approve')
  approve(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Headers('x-tenant-id') t: string,
    @Headers('x-user-id') u: string,
  ) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.approve(did, c, t, u);
  }

  @Patch('campaigns/:campaignId/designs/:did/reject')
  reject(
    @Param('campaignId', ParseUUIDPipe) c: string,
    @Param('did', ParseUUIDPipe) did: string,
    @Body('reason') reason: string,
    @Headers('x-tenant-id') t: string,
  ) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    if (!reason) throw new BadRequestException('Rejection reason is required');
    return this.service.reject(did, c, t, reason);
  }

  // ── Stability AI / Bedrock Image Generation ──────────────────

  /**
   * GET /campaign/ai-images/models
   * Returns the full list of Stability AI models available in Bedrock
   * and their capabilities (text-to-image, inpaint, upscale, etc.)
   */
  @Get('ai-images/models')
  listImageModels() {
    return { data: this.bedrockImages.getAvailableModels() };
  }

  /**
   * GET /campaign/campaigns/:campaignId/ai-images
   * List all AI-generated images for a campaign.
   * Delegates to MediaService with media_type='ai_generated' filter.
   */
  @Get('campaigns/:campaignId/ai-images')
  async listAiImages(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    const items = await this.mediaService.list(campaignId, tenantId, { mediaType: 'ai_generated' });
    return { data: items };
  }

  /**
   * POST /campaign/campaigns/:campaignId/ai-images/generate
   * Generate a campaign image from a text prompt.
   *
   * Body: {
   *   prompt: string            — required, describe the image
   *   negativePrompt?: string   — what to avoid
   *   aspectRatio?: string      — '1:1' | '16:9' | '9:16' | '4:3' | etc.
   *   outputFormat?: string     — 'jpeg' | 'png' | 'webp'
   *   seed?: number             — for reproducibility
   *   stylePreset?: string      — 'photographic' | 'digital-art' | 'cinematic' | etc.
   * }
   *
   * Returns: { imageUrl, s3Key, model, seed, finishReason }
   */
  @Post('campaigns/:campaignId/ai-images/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateImage(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() body: any,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id required');
    if (!userId)   throw new BadRequestException('X-User-Id required');
    if (!body?.prompt) throw new BadRequestException('prompt is required');

    const format = body.outputFormat ?? 'jpeg';
    const result = await this.bedrockImages.generateFromText(
      {
        prompt:         body.prompt,
        negativePrompt: body.negativePrompt,
        aspectRatio:    body.aspectRatio,
        outputFormat:   format,
        seed:           body.seed,
        stylePreset:    body.stylePreset,
        model:          body.model,
      },
      tenantId,
      campaignId,
    );

    // Persist a campaign_media record so GET /ai-images can list them
    try {
      const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
      await this.mediaService.getUploadUrl(campaignId, tenantId, userId, {
        filename:        `ai-generated-${result.seed || Date.now()}.${format === 'jpeg' ? 'jpg' : format}`,
        mime_type:       mimeType,
        media_type:      'ai_generated',
        file_size_bytes: 0,  // unknown at generation time
      }).then(async (rec) => {
        // Update the just-created record with the real S3 key from Bedrock result
        await this.mediaService.markReady(rec.media_id, result.s3Key);
      });
    } catch (_) {
      // Non-fatal — image was generated successfully, record creation is best-effort
    }

    return {
      data: {
        ...result,
        prompt:    body.prompt,
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * POST /campaign/campaigns/:campaignId/ai-images/remove-background
   * Remove the background from a campaign image (e.g. candidate photo).
   *
   * Body: { imageBase64: string, outputFormat?: 'png' | 'webp' }
   */
  @Post('campaigns/:campaignId/ai-images/remove-background')
  @HttpCode(HttpStatus.CREATED)
  async removeBackground(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() body: any,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!tenantId)        throw new BadRequestException('X-Tenant-Id required');
    if (!userId)          throw new BadRequestException('X-User-Id required');
    if (!body?.imageBase64) throw new BadRequestException('imageBase64 is required');

    const result = await this.bedrockImages.removeBackground(
      { imageBase64: body.imageBase64, outputFormat: body.outputFormat },
      tenantId,
      campaignId,
    );

    return { data: result };
  }

  /**
   * POST /campaign/campaigns/:campaignId/ai-images/upscale
   * Upscale a campaign material image to high resolution.
   *
   * Body: {
   *   imageBase64: string
   *   prompt?: string        — optional enhancement guidance
   *   outputFormat?: string
   *   model?: 'creative' | 'conservative' | 'fast'
   * }
   */
  @Post('campaigns/:campaignId/ai-images/upscale')
  @HttpCode(HttpStatus.CREATED)
  async upscaleImage(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() body: any,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!tenantId)          throw new BadRequestException('X-Tenant-Id required');
    if (!userId)            throw new BadRequestException('X-User-Id required');
    if (!body?.imageBase64) throw new BadRequestException('imageBase64 is required');

    const result = await this.bedrockImages.upscaleImage(
      {
        imageBase64:  body.imageBase64,
        prompt:       body.prompt,
        outputFormat: body.outputFormat,
        model:        body.model,
      },
      tenantId,
      campaignId,
    );

    return { data: result };
  }
}
