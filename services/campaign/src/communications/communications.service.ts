// ============================================================
// VoteCapsule™ — Campaign Communications Service (SMS + Incidents)
// ============================================================
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignSmsTemplate } from './entities/campaign-sms-template.entity';
import { CampaignSmsBatch }    from './entities/campaign-sms-batch.entity';
import { CampaignIncident, IncidentStatus } from './entities/campaign-incident.entity';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    @InjectRepository(CampaignSmsTemplate) private readonly templateRepo: Repository<CampaignSmsTemplate>,
    @InjectRepository(CampaignSmsBatch)    private readonly batchRepo: Repository<CampaignSmsBatch>,
    @InjectRepository(CampaignIncident)    private readonly incidentRepo: Repository<CampaignIncident>,
  ) {}

  // ── SMS Templates ──────────────────────────────────────────

  async createTemplate(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignSmsTemplate> {
    // Extract variables from body e.g. {{first_name}}
    const variables = (dto.body.match(/\{\{(\w+)\}\}/g) ?? []).map((v: string) => v.replace(/\{\{|\}\}/g, ''));
    const entity = this.templateRepo.create({ ...dto, campaignId, tenantId, createdBy: userId, variables });
    return this.templateRepo.save(entity);
  }

  async listTemplates(campaignId: string, tenantId: string): Promise<CampaignSmsTemplate[]> {
    return this.templateRepo.find({ where: { campaignId, tenantId }, order: { createdAt: 'DESC' } });
  }

  async approveTemplate(id: string, campaignId: string, tenantId: string, userId: string): Promise<CampaignSmsTemplate> {
    const t = await this.templateRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!t) throw new NotFoundException(`Template ${id} not found`);
    t.approvalStatus = 'approved';
    t.approvedBy = userId;
    t.approvedAt = new Date();
    return this.templateRepo.save(t);
  }

  // ── SMS Batches ────────────────────────────────────────────

  async sendBatch(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignSmsBatch> {
    const batch = this.batchRepo.create({ ...dto, campaignId, tenantId, createdBy: userId, status: 'queued' });
    const saved = await this.batchRepo.save(batch);
    this.logger.log(`SMS batch queued: ${saved.id} for campaign ${campaignId}`);
    // In production this would enqueue to SQS
    return saved;
  }

  async listBatches(campaignId: string, tenantId: string): Promise<CampaignSmsBatch[]> {
    return this.batchRepo.find({ where: { campaignId, tenantId }, order: { createdAt: 'DESC' } });
  }

  async getBatch(id: string, campaignId: string, tenantId: string): Promise<CampaignSmsBatch> {
    const b = await this.batchRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!b) throw new NotFoundException(`Batch ${id} not found`);
    return b;
  }

  async getSmsStats(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    const batches = await this.batchRepo.find({ where: { campaignId, tenantId } });
    const totalSent      = batches.reduce((s, b) => s + b.sentCount, 0);
    const totalDelivered = batches.reduce((s, b) => s + b.deliveredCount, 0);
    const totalCost      = batches.reduce((s, b) => s + Number(b.sentCount) * Number(b.costPerSms), 0);
    return {
      totalBatches: batches.length,
      totalSent,
      totalDelivered,
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      totalCostKes: Math.round(totalCost * 100) / 100,
    };
  }

  // ── Incidents ──────────────────────────────────────────────

  async createIncident(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignIncident> {
    // Generate incident number: INC-{YYYY}-{NNNN}
    const count  = await this.incidentRepo.count({ where: { campaignId, tenantId } });
    const year   = new Date().getFullYear();
    const number = `INC-${year}-${String(count + 1).padStart(4, '0')}`;
    const entity = this.incidentRepo.create({ ...dto, campaignId, tenantId, reportedBy: userId, incidentNumber: number });
    return this.incidentRepo.save(entity);
  }

  async findIncidents(campaignId: string, tenantId: string, filters?: { severity?: string; status?: string; wardCode?: string }): Promise<CampaignIncident[]> {
    const qb = this.incidentRepo.createQueryBuilder('i')
      .where('i.campaign_id = :campaignId', { campaignId })
      .andWhere('i.tenant_id = :tenantId', { tenantId });
    if (filters?.severity) qb.andWhere('i.severity = :sev', { sev: filters.severity });
    if (filters?.status)   qb.andWhere('i.status = :st', { st: filters.status });
    if (filters?.wardCode) qb.andWhere('i.ward_code = :ward', { ward: filters.wardCode });
    return qb.orderBy('i.incident_date', 'DESC').getMany();
  }

  async updateIncident(id: string, campaignId: string, dto: any, tenantId: string): Promise<CampaignIncident> {
    const inc = await this.incidentRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!inc) throw new NotFoundException(`Incident ${id} not found`);
    Object.assign(inc, dto);
    return this.incidentRepo.save(inc);
  }

  async escalateIncident(id: string, campaignId: string, tenantId: string, escalatedTo: string, reason: string): Promise<CampaignIncident> {
    const inc = await this.incidentRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!inc) throw new NotFoundException(`Incident ${id} not found`);
    inc.escalated       = true;
    inc.escalatedTo     = escalatedTo;
    inc.escalatedAt     = new Date();
    inc.escalationReason = reason;
    inc.status          = IncidentStatus.ESCALATED;
    return this.incidentRepo.save(inc);
  }

  async resolveIncident(id: string, campaignId: string, tenantId: string, userId: string, resolution: string): Promise<CampaignIncident> {
    const inc = await this.incidentRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!inc) throw new NotFoundException(`Incident ${id} not found`);
    inc.status     = IncidentStatus.RESOLVED;
    inc.resolution = resolution;
    inc.resolvedBy = userId;
    inc.resolvedAt = new Date();
    return this.incidentRepo.save(inc);
  }
}
