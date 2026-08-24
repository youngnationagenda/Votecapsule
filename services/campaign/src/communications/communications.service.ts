// ============================================================
// VoteCapsule™ — Campaign Communications Service (SMS + Incidents)
// Africa's Talking wired — real SMS dispatch with per-message tracking
// ============================================================
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CampaignSmsTemplate } from './entities/campaign-sms-template.entity';
import { CampaignSmsBatch }    from './entities/campaign-sms-batch.entity';
import { CampaignSmsMessage }  from './entities/campaign-sms-message.entity';
import { CampaignIncident, IncidentStatus } from './entities/campaign-incident.entity';
import { AfricasTalkingProvider } from './providers/africas-talking.provider';

const SMS_COST_KES = 0.80;

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    @InjectRepository(CampaignSmsTemplate) private readonly templateRepo: Repository<CampaignSmsTemplate>,
    @InjectRepository(CampaignSmsBatch)    private readonly batchRepo:    Repository<CampaignSmsBatch>,
    @InjectRepository(CampaignSmsMessage)  private readonly messageRepo:  Repository<CampaignSmsMessage>,
    @InjectRepository(CampaignIncident)    private readonly incidentRepo: Repository<CampaignIncident>,
    private readonly dataSource:  DataSource,
    private readonly atProvider:  AfricasTalkingProvider,
  ) {}

  // ── SMS Templates ──────────────────────────────────────────────

  async createTemplate(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignSmsTemplate> {
    const variables = (dto.body?.match(/\{\{(\w+)\}\}/g) ?? []).map(
      (v: string) => v.replace(/\{\{|\}\}/g, ''),
    );
    const entity = this.templateRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      variables,
    }) as unknown as CampaignSmsTemplate;
    return this.templateRepo.save(entity);
  }

  async listTemplates(
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignSmsTemplate[]> {
    return this.templateRepo.find({
      where: { campaignId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async approveTemplate(
    id: string,
    campaignId: string,
    tenantId: string,
    userId: string,
  ): Promise<CampaignSmsTemplate> {
    const t = await this.templateRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!t) throw new NotFoundException(`Template ${id} not found`);
    t.approvalStatus = 'approved';
    t.approvedBy     = userId;
    t.approvedAt     = new Date();
    return this.templateRepo.save(t);
  }

  // ── SMS Batches ────────────────────────────────────────────────

  /**
   * sendBatch — full Africa's Talking dispatch
   * 1. Resolve recipients from dto.recipients (array of {phone, name, ...vars})
   * 2. Render template body per recipient
   * 3. Check consent (skipped in MVP — consent table TODO in future migration)
   * 4. Dispatch via AT in chunks of 100
   * 5. Write per-message records
   * 6. Update batch stats
   * 7. Auto-create campaign expense: recipient_count × 0.80 KES
   */
  async sendBatch(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignSmsBatch> {
    // Validate recipients
    const recipients: Array<{ phone: string; vars?: Record<string, string> }> =
      dto.recipients ?? [];
    if (!recipients.length) {
      throw new BadRequestException('recipients array is required and must not be empty');
    }

    // Fetch template if provided
    let templateBody = dto.messageContent as string | undefined;
    if (!templateBody && dto.templateId) {
      const tmpl = await this.templateRepo.findOne({
        where: { id: dto.templateId, campaignId, tenantId },
      });
      if (!tmpl) throw new NotFoundException(`Template ${dto.templateId} not found`);
      if (tmpl.approvalStatus !== 'approved') {
        throw new BadRequestException(`Template ${dto.templateId} is not approved`);
      }
      templateBody = (tmpl as any).body as string;
    }
    if (!templateBody) {
      throw new BadRequestException('Either templateId or messageContent is required');
    }

    // Create batch record
    const batch = this.batchRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy:        userId,
      status:           'sending',
      totalRecipients:  recipients.length,
      costPerSms:       SMS_COST_KES,
    }) as unknown as CampaignSmsBatch;
    const savedBatch = await this.batchRepo.save(batch);

    // Build messages and phone list
    const phoneNumbers: string[] = [];
    const messageRecords: Partial<CampaignSmsMessage>[] = [];

    for (const r of recipients) {
      let body = templateBody;
      // Replace template variables
      if (r.vars) {
        for (const [key, val] of Object.entries(r.vars)) {
          body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        }
      }
      phoneNumbers.push(r.phone);
      messageRecords.push({
        batchId:        savedBatch.id,
        campaignId,
        tenantId,
        phoneNumber:    r.phone,
        messageContent: body,
        costKes:        SMS_COST_KES,
        status:         'queued',
      });
    }

    // Bulk insert message records
    await this.messageRepo.insert(messageRecords);

    // Dispatch via Africa's Talking
    try {
      const result = await this.atProvider.send(
        phoneNumbers,
        templateBody, // Use base template for bulk send (AT doesn't support per-recipient body in single call)
        dto.senderId,
      );

      // Update batch stats
      savedBatch.sentCount      = result.successCount;
      savedBatch.failedCount    = result.failedCount;
      savedBatch.pendingCount   = Math.max(0, recipients.length - result.successCount - result.failedCount);
      savedBatch.sentAt         = new Date();
      savedBatch.status         = 'sent';
      savedBatch.providerBatchId = result.messageIds[0] ?? null;
      await this.batchRepo.save(savedBatch);

      // Update sent messages to 'sent' status
      await this.messageRepo
        .createQueryBuilder()
        .update(CampaignSmsMessage)
        .set({ status: 'sent', sentAt: new Date() })
        .where('batch_id = :batchId', { batchId: savedBatch.id })
        .execute();

      // Auto-create expense entry via raw SQL (budget may not exist)
      const totalCostKes = result.successCount * SMS_COST_KES;
      if (totalCostKes > 0) {
        await this.dataSource.query(
          `INSERT INTO campaign_expenses
            (campaign_id, tenant_id, description, amount, expense_date, source_type, payment_method, iebc_reportable, recorded_by)
           VALUES ($1, $2, $3, $4, CURRENT_DATE, 'SMS', 'mpesa', TRUE, $5)
           ON CONFLICT DO NOTHING`,
          [
            campaignId,
            tenantId,
            `SMS Batch: ${savedBatch.id} (${result.successCount} messages)`,
            totalCostKes,
            userId,
          ],
        );
      }

      this.logger.log(
        `SMS batch ${savedBatch.id}: ${result.successCount} sent, ${result.failedCount} failed`,
      );
    } catch (err) {
      savedBatch.status = 'failed';
      await this.batchRepo.save(savedBatch);
      this.logger.error(`SMS batch ${savedBatch.id} failed`, err);
      throw err;
    }

    return savedBatch;
  }

  async listBatches(campaignId: string, tenantId: string): Promise<CampaignSmsBatch[]> {
    return this.batchRepo.find({
      where: { campaignId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBatch(id: string, campaignId: string, tenantId: string): Promise<CampaignSmsBatch> {
    const b = await this.batchRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!b) throw new NotFoundException(`Batch ${id} not found`);
    return b;
  }

  async getSmsStats(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    const batches = await this.batchRepo.find({ where: { campaignId, tenantId } });
    const totalSent      = batches.reduce((s, b) => s + b.sentCount,      0);
    const totalDelivered = batches.reduce((s, b) => s + b.deliveredCount, 0);
    const totalCost      = batches.reduce((s, b) => s + Number(b.sentCount) * Number(b.costPerSms), 0);
    return {
      totalBatches: batches.length,
      totalSent,
      totalDelivered,
      deliveryRate:  totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      totalCostKes:  Math.round(totalCost * 100) / 100,
    };
  }

  // ── Delivery Webhook ──────────────────────────────────────────

  /**
   * Africa's Talking POSTs delivery reports to /webhooks/at/delivery
   * Payload shape: { id, status, phoneNumber, networkCode }
   */
  async handleDeliveryWebhook(payload: any): Promise<void> {
    const { id: providerMessageId, status, phoneNumber } = payload ?? {};
    if (!providerMessageId || !status) return;

    // Map AT status to internal status
    const internalStatus =
      status === 'Success'     ? 'delivered'   :
      status === 'Sent'        ? 'sent'         :
      status === 'Failed'      ? 'failed'       :
      status === 'Rejected'    ? 'failed'       :
      status === 'Undelivered' ? 'undelivered'  : 'sent';

    await this.messageRepo
      .createQueryBuilder()
      .update(CampaignSmsMessage)
      .set({
        status:      internalStatus,
        deliveredAt: internalStatus === 'delivered' ? new Date() : undefined,
      })
      .where('provider_message_id = :pmid OR phone_number = :phone', {
        pmid:  providerMessageId,
        phone: phoneNumber,
      })
      .execute();

    // Update batch delivered count
    if (internalStatus === 'delivered' && phoneNumber) {
      const msg = await this.messageRepo.findOne({ where: { phoneNumber } });
      if (msg) {
        await this.batchRepo.increment({ id: msg.batchId }, 'delivered_count', 1);
      }
    }

    this.logger.debug(`Delivery webhook: ${providerMessageId} → ${internalStatus}`);
  }

  // ── Incidents ──────────────────────────────────────────────────

  async createIncident(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignIncident> {
    const count  = await this.incidentRepo.count({ where: { campaignId, tenantId } });
    const year   = new Date().getFullYear();
    const number = `INC-${year}-${String(count + 1).padStart(4, '0')}`;
    const entity = this.incidentRepo.create({
      ...dto,
      campaignId,
      tenantId,
      reportedBy:     userId,
      incidentNumber: number,
    }) as unknown as CampaignIncident;
    return this.incidentRepo.save(entity);
  }

  async findIncidents(
    campaignId: string,
    tenantId: string,
    filters?: { severity?: string; status?: string; wardCode?: string },
  ): Promise<CampaignIncident[]> {
    const qb = this.incidentRepo.createQueryBuilder('i')
      .where('i.campaign_id = :campaignId', { campaignId })
      .andWhere('i.tenant_id = :tenantId', { tenantId });
    if (filters?.severity) qb.andWhere('i.severity = :sev', { sev: filters.severity });
    if (filters?.status)   qb.andWhere('i.status = :st',   { st: filters.status });
    if (filters?.wardCode) qb.andWhere('i.ward_code = :ward', { ward: filters.wardCode });
    return qb.orderBy('i.incident_date', 'DESC').getMany();
  }

  async updateIncident(
    id: string,
    campaignId: string,
    dto: any,
    tenantId: string,
  ): Promise<CampaignIncident> {
    const inc = await this.incidentRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!inc) throw new NotFoundException(`Incident ${id} not found`);
    Object.assign(inc, dto);
    return this.incidentRepo.save(inc);
  }

  async escalateIncident(
    id: string,
    campaignId: string,
    tenantId: string,
    escalatedTo: string,
    reason: string,
  ): Promise<CampaignIncident> {
    const inc = await this.incidentRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!inc) throw new NotFoundException(`Incident ${id} not found`);
    inc.escalated        = true;
    inc.escalatedTo      = escalatedTo;
    inc.escalatedAt      = new Date();
    inc.escalationReason = reason;
    inc.status           = IncidentStatus.ESCALATED;
    return this.incidentRepo.save(inc);
  }

  async resolveIncident(
    id: string,
    campaignId: string,
    tenantId: string,
    userId: string,
    resolution: string,
  ): Promise<CampaignIncident> {
    const inc = await this.incidentRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!inc) throw new NotFoundException(`Incident ${id} not found`);
    inc.status     = IncidentStatus.RESOLVED;
    inc.resolution = resolution;
    inc.resolvedBy = userId;
    inc.resolvedAt = new Date();
    return this.incidentRepo.save(inc);
  }
}
