// ============================================================
// VoteCapsule — Notification Service
// Channels: FCM Push | Amazon SES Email | Amazon SNS SMS
// EventBridge listener: ESCALATION_CREATED, WORKFLOW_COMPLETED
// ============================================================
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository }                       from '@nestjs/typeorm';
import { Repository, DataSource, In }             from 'typeorm';

import { FcmProvider }   from './providers/fcm.provider';
import { SesProvider }   from './providers/ses.provider';
import { SnsProvider }   from './providers/sns.provider';

import { Notification, NotificationStatus }     from './entities/notification.entity';
import { NotificationTemplate, NotificationChannel, NotificationType } from './entities/notification-template.entity';
import { NotificationDelivery, DeliveryStatus } from './entities/notification-delivery.entity';
import { NotificationDevice }                   from './entities/notification-device.entity';

import { SendNotificationDto, BulkNotificationDto } from './dto/send-notification.dto';
import { RegisterDeviceDto }                         from './dto/register-device.dto';
import {
  EscalationCreatedDetail,
  WorkflowCompletedDetail,
} from './dto/eventbridge-event.dto';

/** Substitutes {{key}} placeholders in a template string */
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepo: Repository<NotificationDelivery>,
    @InjectRepository(NotificationDevice)
    private readonly deviceRepo: Repository<NotificationDevice>,
    private readonly dataSource: DataSource,
    private readonly fcm:  FcmProvider,
    private readonly ses:  SesProvider,
    private readonly sns:  SnsProvider,
  ) {}

  // ── Public API ─────────────────────────────────────────────

  /**
   * Send a single notification. Resolves template, persists record,
   * dispatches over the requested channel.
   */
  async send(dto: SendNotificationDto): Promise<Notification> {
    const { title, body } = await this.resolveContent(dto);

    const notification = await this.dataSource.transaction(async (manager) => {
      const n = manager.create(Notification, {
        userId:           dto.userId,
        tenantId:         dto.tenantId ?? null,
        notificationType: dto.notificationType,
        channel:          dto.channel,
        title,
        body,
        data:             dto.data ?? {},
        referenceId:      dto.referenceId ?? null,
        referenceType:    dto.referenceType ?? null,
        status:           NotificationStatus.PENDING,
      });
      return manager.save(n);
    });

    // Dispatch asynchronously — do not block the HTTP response
    setImmediate(() => {
      this.dispatch(notification).catch((err: unknown) => {
        this.logger.error(`Dispatch failed for notification ${notification.id}: ${String(err)}`);
      });
    });

    return notification;
  }

  /**
   * Send the same notification to many users (fan-out).
   * Resolves template once, persists one record per user.
   */
  async sendBulk(dto: BulkNotificationDto): Promise<{ queued: number }> {
    const templateDto: SendNotificationDto = {
      userId:           dto.userIds[0] ?? '',
      tenantId:         dto.tenantId,
      notificationType: dto.notificationType,
      channel:          dto.channel,
      templateVars:     dto.templateVars,
      data:             dto.data,
      referenceId:      dto.referenceId,
      referenceType:    dto.referenceType,
    };
    const { title, body } = await this.resolveContent(templateDto);

    let queued = 0;
    for (const userId of dto.userIds) {
      const n = await this.dataSource.transaction(async (manager) => {
        const notif = manager.create(Notification, {
          userId,
          tenantId:         dto.tenantId ?? null,
          notificationType: dto.notificationType,
          channel:          dto.channel,
          title,
          body,
          data:             dto.data ?? {},
          referenceId:      dto.referenceId ?? null,
          referenceType:    dto.referenceType ?? null,
          status:           NotificationStatus.PENDING,
        });
        return manager.save(notif);
      });

      setImmediate(() => {
        this.dispatch(n).catch((err: unknown) => {
          this.logger.error(`Bulk dispatch failed for notification ${n.id}: ${String(err)}`);
        });
      });
      queued++;
    }

    return { queued };
  }

  // ── EventBridge Handlers ───────────────────────────────────

  /**
   * Handle ESCALATION_CREATED from Workflow Engine.
   * Notifies all supervisors with PUSH + EMAIL.
   */
  async handleEscalationCreated(detail: EscalationCreatedDetail): Promise<void> {
    this.logger.log(
      `Handling ESCALATION_CREATED: ${detail.escalationType} [${detail.severity}] escalationId=${detail.escalationId}`,
    );

    const vars: Record<string, string> = {
      escalationType:    detail.escalationType,
      severity:          detail.severity,
      capsuleReference:  detail.capsuleId ?? 'N/A',
      tenantName:        detail.tenantId  ?? 'N/A',
    };

    // TODO: Look up supervisor user IDs from Identity Service
    // For now: publish a platform-level alert to a known supervisor topic.
    // When Identity Service is queryable, replace with:
    //   const supervisors = await this.getSupervisors(detail.tenantId);
    //   for (const supervisor of supervisors) { await this.send(...) }

    // Push notification — sent to all registered supervisor devices
    // (In production: fan-out to supervisor FCM tokens for the tenant)
    this.logger.log(
      `[ESCALATION_CREATED] vars=${JSON.stringify(vars)} — supervisor fan-out pending Identity Service integration`,
    );
  }

  /**
   * Handle WORKFLOW_COMPLETED from Workflow Engine.
   * Notifies relevant parties based on final status.
   */
  async handleWorkflowCompleted(detail: WorkflowCompletedDetail): Promise<void> {
    this.logger.log(
      `Handling WORKFLOW_COMPLETED: type=${detail.workflowType} status=${detail.finalStatus} executionId=${detail.executionId}`,
    );

    if (detail.workflowType !== 'EVIDENCE_CAPSULE') return;

    switch (detail.finalStatus) {
      case 'SUCCEEDED':
        this.logger.log(
          `[WORKFLOW_COMPLETED] SUCCEEDED capsuleId=${detail.capsuleId ?? 'N/A'} — notify agent push queued`,
        );
        break;
      case 'FAILED':
      case 'TIMED_OUT':
        this.logger.warn(
          `[WORKFLOW_COMPLETED] ${detail.finalStatus} for capsule ${detail.capsuleId ?? 'N/A'} — escalation already raised by Workflow Engine`,
        );
        break;
    }
  }

  // ── Device Token Registry ──────────────────────────────────

  async registerDevice(dto: RegisterDeviceDto): Promise<NotificationDevice> {
    const existing = await this.deviceRepo.findOne({
      where: { userId: dto.userId, deviceToken: dto.deviceToken },
    });

    if (existing) {
      existing.isActive = true;
      existing.platform = dto.platform;
      return this.deviceRepo.save(existing);
    }

    const device = this.deviceRepo.create({
      userId:      dto.userId,
      deviceToken: dto.deviceToken,
      platform:    dto.platform,
      isActive:    true,
    });
    return this.deviceRepo.save(device);
  }

  async deregisterDevice(userId: string, deviceToken: string): Promise<void> {
    await this.deviceRepo.update(
      { userId, deviceToken },
      { isActive: false },
    );
  }

  // ── Read + Mark-Read ───────────────────────────────────────

  async getUserNotifications(
    userId:  string,
    limit:   number = 50,
    offset:  number = 0,
    unread?: boolean,
  ): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (unread) {
      qb.andWhere('n.status != :read', { read: NotificationStatus.READ });
    }

    const [items, total] = await qb.getManyAndCount();

    const unreadCount = await this.notifRepo.count({
      where: { userId, status: In([NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING]) },
    });

    return { items, total, unreadCount };
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ status: NotificationStatus.READ, readAt: () => 'NOW()' })
      .where('id IN (:...ids)', { ids: notificationIds })
      .andWhere('userId = :userId', { userId })
      .execute();
  }

  async getStats(): Promise<{
    total: number;
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
    deliverySuccessRate: number;
  }> {
    const byChannel = await this.notifRepo
      .createQueryBuilder('n')
      .select('n.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('n.channel')
      .getRawMany<{ channel: string; count: string }>();

    const byStatus = await this.notifRepo
      .createQueryBuilder('n')
      .select('n.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('n.status')
      .getRawMany<{ status: string; count: string }>();

    const total = await this.notifRepo.count();

    const delivered = await this.deliveryRepo.count({
      where: { status: DeliveryStatus.DELIVERED },
    });
    const totalDeliveries = await this.deliveryRepo.count();
    const deliverySuccessRate = totalDeliveries > 0
      ? Math.round((delivered / totalDeliveries) * 10000) / 10000
      : 0;

    return {
      total,
      byChannel: Object.fromEntries(byChannel.map((r) => [r.channel, parseInt(r.count, 10)])),
      byStatus:  Object.fromEntries(byStatus.map((r) => [r.status, parseInt(r.count, 10)])),
      deliverySuccessRate,
    };
  }

  // ── Private: Dispatch ──────────────────────────────────────

  private async dispatch(notification: Notification): Promise<void> {
    const delivery = this.deliveryRepo.create({
      notificationId: notification.id,
      channel:        notification.channel,
      status:         DeliveryStatus.PENDING,
      attempts:       0,
    });
    await this.deliveryRepo.save(delivery);

    delivery.attempts++;
    delivery.lastAttemptAt = new Date();

    try {
      switch (notification.channel) {
        case NotificationChannel.PUSH:
          await this.dispatchPush(notification, delivery);
          break;
        case NotificationChannel.EMAIL:
          await this.dispatchEmail(notification, delivery);
          break;
        case NotificationChannel.SMS:
          await this.dispatchSms(notification, delivery);
          break;
        case NotificationChannel.IN_APP:
          // In-App: already persisted in DB; polling or WebSocket will surface it
          delivery.status      = DeliveryStatus.DELIVERED;
          delivery.deliveredAt = new Date();
          break;
      }
    } catch (err: unknown) {
      delivery.status       = DeliveryStatus.FAILED;
      delivery.errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Dispatch exception for ${notification.id}: ${delivery.errorMessage}`);
    }

    await this.deliveryRepo.save(delivery);

    // Update parent notification status
    const newStatus: NotificationStatus =
      delivery.status === DeliveryStatus.DELIVERED ? NotificationStatus.DELIVERED :
      delivery.status === DeliveryStatus.SENT      ? NotificationStatus.SENT      :
      NotificationStatus.FAILED;

    await this.notifRepo.update(notification.id, {
      status: newStatus,
      sentAt:    delivery.status !== DeliveryStatus.FAILED ? new Date() : undefined,
      failedAt:  delivery.status === DeliveryStatus.FAILED  ? new Date() : undefined,
    });
  }

  private async dispatchPush(
    notification: Notification,
    delivery:     NotificationDelivery,
  ): Promise<void> {
    const tokens = await this.deviceRepo.find({
      where: { userId: notification.userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No active FCM tokens for userId ${notification.userId}`);
      delivery.status       = DeliveryStatus.FAILED;
      delivery.errorMessage = 'No registered devices';
      return;
    }

    const stringData: Record<string, string> = {};
    const raw = notification.data ?? {};
    for (const [k, v] of Object.entries(raw)) {
      stringData[k] = String(v);
    }

    if (tokens.length === 1 && tokens[0]) {
      const result = await this.fcm.sendToDevice(
        tokens[0].deviceToken,
        notification.title,
        notification.body,
        stringData,
      );
      delivery.status            = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
      delivery.providerMessageId = result.messageId ?? null;
      delivery.errorMessage      = result.error ?? null;
      if (result.success) delivery.deliveredAt = new Date();
    } else {
      const { successCount } = await this.fcm.sendMulticast(
        tokens.map((t) => t.deviceToken),
        notification.title,
        notification.body,
        stringData,
      );
      delivery.status      = successCount > 0 ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
      if (successCount > 0) delivery.deliveredAt = new Date();
    }
  }

  private async dispatchEmail(
    notification: Notification,
    delivery:     NotificationDelivery,
  ): Promise<void> {
    // TODO: Look up user email from Identity Service
    // For now: skip silently if no email address in notification.data
    const emailTo = notification.data?.['email'] as string | undefined;

    if (!emailTo) {
      this.logger.warn(`No email address in data for notification ${notification.id} — skipping SES dispatch`);
      delivery.status       = DeliveryStatus.FAILED;
      delivery.errorMessage = 'No email address provided in data payload';
      return;
    }

    const result = await this.ses.sendEmail({
      to:       emailTo,
      subject:  notification.title,
      textBody: notification.body,
    });

    delivery.status            = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
    delivery.providerMessageId = result.messageId ?? null;
    delivery.errorMessage      = result.error ?? null;
    if (result.success) delivery.deliveredAt = new Date();
  }

  private async dispatchSms(
    notification: Notification,
    delivery:     NotificationDelivery,
  ): Promise<void> {
    const phone = notification.data?.['phone'] as string | undefined;

    if (!phone) {
      this.logger.warn(`No phone number in data for notification ${notification.id} — skipping SNS dispatch`);
      delivery.status       = DeliveryStatus.FAILED;
      delivery.errorMessage = 'No phone number provided in data payload';
      return;
    }

    const result = await this.sns.sendSms(phone, notification.body);
    delivery.status            = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
    delivery.providerMessageId = result.messageId ?? null;
    delivery.errorMessage      = result.error ?? null;
    if (result.success) delivery.deliveredAt = new Date();
  }

  // ── Private: Template Resolution ──────────────────────────

  private async resolveContent(
    dto: SendNotificationDto,
  ): Promise<{ title: string; body: string }> {
    if (dto.title && dto.body) {
      return { title: dto.title, body: dto.body };
    }

    const templateName = this.buildTemplateName(dto.notificationType, dto.channel);
    const template = await this.templateRepo.findOne({
      where: { name: templateName, isActive: true },
    });

    if (!template) {
      // Fallback — use the enum value as a minimal title/body
      return {
        title: dto.title ?? dto.notificationType,
        body:  dto.body  ?? dto.notificationType,
      };
    }

    const vars = dto.templateVars ?? {};
    const body = renderTemplate(template.bodyTemplate, vars);

    let title = dto.title;
    if (!title) {
      title = template.subjectTemplate
        ? renderTemplate(template.subjectTemplate, vars)
        : dto.notificationType;
    }

    return { title, body };
  }

  private buildTemplateName(
    notificationType: string,
    channel:          NotificationChannel,
  ): string {
    return `${notificationType.toLowerCase()}_${channel.toLowerCase()}`;
  }
}
