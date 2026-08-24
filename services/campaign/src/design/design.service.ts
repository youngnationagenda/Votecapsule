// ============================================================
// VoteCapsule™ — Campaign Design Service
// ============================================================
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignDesignRequest } from './entities/campaign-design-request.entity';
import { CampaignMockupTemplate } from './entities/campaign-mockup-template.entity';
import { MockupService }          from './mockup-engine/mockup.service';
import { MediaService }           from '../media/media.service';

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    @InjectRepository(CampaignDesignRequest)
    private readonly designRepo: Repository<CampaignDesignRequest>,
    @InjectRepository(CampaignMockupTemplate)
    private readonly templateRepo: Repository<CampaignMockupTemplate>,
    private readonly mockupService: MockupService,
    private readonly mediaService:  MediaService,
  ) {}

  // ── Templates ─────────────────────────────────────────────────

  async getTemplatesForType(materialTypeId: string): Promise<CampaignMockupTemplate[]> {
    return this.templateRepo.find({
      where: { materialTypeId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Design Requests ───────────────────────────────────────────

  async list(campaignId: string, tenantId: string): Promise<CampaignDesignRequest[]> {
    const results = await this.designRepo.find({
      where: { campaignId, tenantId },
      order: { createdAt: 'DESC' },
    });
    return results;
  }

  async create(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignDesignRequest> {
    const entity = this.designRepo.create({
      ...dto,
      campaignId,
      tenantId,
      requestedBy:    userId,
      approvalStatus: 'draft',
    });
    return this.designRepo.save(entity) as unknown as Promise<CampaignDesignRequest>;
  }

  async findOne(id: string, campaignId: string, tenantId: string): Promise<CampaignDesignRequest> {
    const d = await this.designRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!d) throw new NotFoundException(`Design request ${id} not found`);
    return d;
  }

  // ── Generate Mockup ───────────────────────────────────────────

  async generate(
    id: string,
    campaignId: string,
    tenantId: string,
  ): Promise<{ preview_url: string }> {
    const design = await this.findOne(id, campaignId, tenantId);

    if (!design.templateId) {
      throw new BadRequestException('Design request has no template assigned');
    }

    const template = await this.templateRepo.findOne({ where: { id: design.templateId } });
    if (!template) throw new NotFoundException(`Template ${design.templateId} not found`);

    // Mark as generating
    design.approvalStatus = 'generating';
    await this.designRepo.save(design);

    try {
      const { previewKey, highresKey } = await this.mockupService.generateMockup({
        tenantId,
        campaignId,
        designRequestId:   design.id,
        baseImageKey:      template.baseImageKey,
        candidatePhotoKey: design.candidatePhotoKey,
        candidateName:     design.candidateName,
        candidateSlogan:   design.candidateSlogan,
        primaryColour:     design.primaryColour,
        secondaryColour:   design.secondaryColour,
        zones:             template.zones,
        canvasWidth:       template.canvasWidth,
        canvasHeight:      template.canvasHeight,
      });

        // Media records for preview and highres are created by the mockup pipeline
      // The previewKey and highresKey are S3 paths ready for signed URL generation

      // Update design request status
      design.approvalStatus = 'preview_ready';
      await this.designRepo.save(design);

      const previewUrl = await this.mockupService.getSignedUrl(previewKey);
      return { preview_url: previewUrl };
    } catch (err) {
      design.approvalStatus = 'draft';
      await this.designRepo.save(design);
      throw err;
    }
  }

  // ── Approval ──────────────────────────────────────────────────

  async approve(
    id: string,
    campaignId: string,
    tenantId: string,
    userId: string,
  ): Promise<CampaignDesignRequest> {
    const d = await this.findOne(id, campaignId, tenantId);
    if (d.approvalStatus !== 'preview_ready') {
      throw new BadRequestException('Design must be in preview_ready status to approve');
    }
    d.approvalStatus = 'approved';
    d.approvedBy     = userId;
    d.approvedAt     = new Date();
    return this.designRepo.save(d);
  }

  async reject(
    id: string,
    campaignId: string,
    tenantId: string,
    reason: string,
  ): Promise<CampaignDesignRequest> {
    const d = await this.findOne(id, campaignId, tenantId);
    d.approvalStatus  = 'rejected';
    d.rejectionReason = reason;
    return this.designRepo.save(d);
  }

  async getPreviewUrl(id: string, campaignId: string, tenantId: string): Promise<string> {
    const d = await this.findOne(id, campaignId, tenantId);
    if (!d.previewMediaId) {
      throw new NotFoundException(`Preview not yet generated for design ${id}`);
    }
    return this.mediaService.getSignedUrl(d.previewMediaId, campaignId, tenantId);
  }
}
