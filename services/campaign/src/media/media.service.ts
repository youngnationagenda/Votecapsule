// ============================================================
// VoteCapsule™ — Campaign Media Service
// Presigned upload flow, signed GET URLs, tag/description update
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CampaignMedia }     from './entities/campaign-media.entity';
import { MediaUploadService } from './media.upload.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(CampaignMedia)
    private readonly repo: Repository<CampaignMedia>,
    private readonly uploadService: MediaUploadService,
  ) {}

  // ── Upload URL generation (step 1 of 2-step upload flow) ─────

  async getUploadUrl(
    campaignId: string,
    tenantId: string,
    userId: string,
    dto: {
      filename: string;
      mime_type: string;
      media_type: string;
      file_size_bytes: number;
    },
  ): Promise<{ upload_url: string; media_id: string }> {
    const key = this.uploadService.buildKey(
      tenantId,
      campaignId,
      dto.media_type,
      dto.filename,
    );

    const uploadUrl = await this.uploadService.getUploadUrl(
      key,
      dto.mime_type,
      dto.file_size_bytes,
    );

    // Create media record with pending processing status
    const media = this.repo.create({
      campaignId,
      tenantId,
      storageKey:      key,
      fileName:        dto.filename,
      mimeType:        dto.mime_type,
      mediaType:       dto.media_type,
      fileSizeBytes:   dto.file_size_bytes,
      uploadedBy:      userId,
      processingStatus: 'pending',
      approvalStatus:  'pending',
    });
    const saved = await this.repo.save(media);
    this.logger.log(`Media record created: ${saved.id} for campaign ${campaignId}`);
    return { upload_url: uploadUrl, media_id: saved.id };
  }

  // ── Signed GET URLs ───────────────────────────────────────────

  async getSignedUrl(id: string, campaignId: string, tenantId: string): Promise<string> {
    const m = await this.findOne(id, campaignId, tenantId);
    return this.uploadService.getSignedGetUrl(m.storageKey);
  }

  async getThumbnailUrl(id: string, campaignId: string, tenantId: string): Promise<string> {
    const m = await this.findOne(id, campaignId, tenantId);
    if (!m.thumbnailKey) {
      // Fallback to main key if thumbnail not yet generated
      return this.uploadService.getSignedGetUrl(m.storageKey);
    }
    return this.uploadService.getSignedGetUrl(m.thumbnailKey);
  }

  async getPreviewUrl(id: string, campaignId: string, tenantId: string): Promise<string> {
    const m = await this.findOne(id, campaignId, tenantId);
    const previewKey = m.thumbnailKey
      ? this.uploadService.buildPreviewKey(m.storageKey)
      : m.storageKey;
    return this.uploadService.getSignedGetUrl(previewKey);
  }

  // ── List + Update ─────────────────────────────────────────────

  async list(
    campaignId: string,
    tenantId: string,
    filters?: { mediaType?: string; tags?: string[] },
  ): Promise<CampaignMedia[]> {
    const qb = this.repo.createQueryBuilder('m')
      .where('m.campaign_id = :campaignId', { campaignId })
      .andWhere('m.tenant_id = :tenantId', { tenantId });

    if (filters?.mediaType) {
      qb.andWhere('m.media_type = :mt', { mt: filters.mediaType });
    }
    if (filters?.tags && filters.tags.length > 0) {
      qb.andWhere('m.tags && :tags', { tags: filters.tags });
    }
    return qb.orderBy('m.created_at', 'DESC').getMany();
  }

  async findOne(id: string, campaignId: string, tenantId: string): Promise<CampaignMedia> {
    const m = await this.repo.findOne({ where: { id, campaignId, tenantId } });
    if (!m) throw new NotFoundException(`Media ${id} not found`);
    return m;
  }

  async update(
    id: string,
    campaignId: string,
    tenantId: string,
    dto: { description?: string; tags?: string[] },
  ): Promise<CampaignMedia> {
    const m = await this.findOne(id, campaignId, tenantId);
    if (dto.description !== undefined) m.description = dto.description;
    if (dto.tags !== undefined)        m.tags        = dto.tags;
    return this.repo.save(m);
  }

  // ── Internal: mark record ready after S3 Lambda processing ───

  async markReady(
    id: string,
    thumbnailKey: string,
    widthPx?: number,
    heightPx?: number,
  ): Promise<void> {
    await this.repo.update(id, {
      processingStatus: 'ready',
      thumbnailKey,
      widthPx:  widthPx  ?? undefined,
      heightPx: heightPx ?? undefined,
    });
  }
}
