// ============================================================
// VoteCapsule — Notification Controller
// BASE: /api/v1/notifications
//
// POST   /notifications                    — send one notification
// POST   /notifications/bulk               — fan-out to many users
// POST   /notifications/email              — direct email (no userId required — for invitations)
// GET    /notifications/user/:userId       — list user notifications
// PUT    /notifications/read               — mark as read
// GET    /notifications/stats              — delivery stats
// POST   /notifications/devices            — register FCM device token
// DELETE /notifications/devices            — deregister FCM device token
// POST   /notifications/events/workflow    — EventBridge webhook (Workflow Engine)
// POST   /notifications/templates          — create a template
// GET    /notifications/templates          — list templates
// ============================================================
import {
  Controller, Post, Get, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
  Logger, BadRequestException,
} from '@nestjs/common';
import { NotificationService }                  from './notification.service';
import { SendNotificationDto, BulkNotificationDto } from './dto/send-notification.dto';
import { RegisterDeviceDto, MarkReadDto }        from './dto/register-device.dto';
import { EventBridgeEnvelopeDto }               from './dto/eventbridge-event.dto';
import type {
  EscalationCreatedDetail,
  WorkflowCompletedDetail,
} from './dto/eventbridge-event.dto';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * POST /notifications
   * Send a notification to a single user.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async send(@Body() dto: SendNotificationDto) {
    const notification = await this.notificationService.send(dto);
    return {
      notificationId: notification.id,
      status:         notification.status,
      channel:        notification.channel,
    };
  }

  /**
   * POST /notifications/bulk
   * Fan-out the same notification to many users.
   */
  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendBulk(@Body() dto: BulkNotificationDto) {
    return this.notificationService.sendBulk(dto);
  }

  /**
   * GET /notifications/user/:userId
   * List notifications for a user.
   * Query params: limit, offset, unread=true
   */
  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit',  new DefaultValuePipe(50),  ParseIntPipe) limit:  number,
    @Query('offset', new DefaultValuePipe(0),   ParseIntPipe) offset: number,
    @Query('unread') unread?: string,
  ) {
    return this.notificationService.getUserNotifications(
      userId,
      limit,
      offset,
      unread === 'true',
    );
  }

  /**
   * PUT /notifications/read
   * Mark notifications as read.
   * Body: { notificationIds: string[], userId: string }
   */
  @Put('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Body('userId', ParseUUIDPipe) userId: string,
    @Body() dto: MarkReadDto,
  ) {
    await this.notificationService.markAsRead(userId, dto.notificationIds);
  }

  /**
   * GET /notifications/stats
   */
  @Get('stats')
  async getStats() {
    return this.notificationService.getStats();
  }

  /**
   * POST /notifications/devices
   * Register an FCM device token for push notifications.
   */
  @Post('devices')
  @HttpCode(HttpStatus.CREATED)
  async registerDevice(@Body() dto: RegisterDeviceDto) {
    const device = await this.notificationService.registerDevice(dto);
    return { deviceId: device.id, platform: device.platform };
  }

  /**
   * DELETE /notifications/devices
   * Deregister an FCM device token.
   */
  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deregisterDevice(
    @Body('userId', ParseUUIDPipe) userId: string,
    @Body('deviceToken') deviceToken: string,
  ) {
    await this.notificationService.deregisterDevice(userId, deviceToken);
  }

  /**
   * POST /notifications/events/workflow
   * EventBridge target — receives events from the votecapsule-events bus.
   * Events: ESCALATION_CREATED, WORKFLOW_COMPLETED
   */
  @Post('events/workflow')
  @HttpCode(HttpStatus.OK)
  async handleWorkflowEvent(@Body() envelope: EventBridgeEnvelopeDto) {
    const detailType = envelope['detail-type'];
    this.logger.log(`EventBridge event received: ${detailType}`);

    switch (detailType) {
      case 'ESCALATION_CREATED':
        await this.notificationService.handleEscalationCreated(
          envelope.detail as unknown as EscalationCreatedDetail,
        );
        break;
      case 'WORKFLOW_COMPLETED':
        await this.notificationService.handleWorkflowCompleted(
          envelope.detail as unknown as WorkflowCompletedDetail,
        );
        break;
      default:
        this.logger.warn(`Unhandled EventBridge detail-type: ${detailType}`);
    }

    return { received: true };
  }

  /**
   * POST /notifications/email
   * Send a direct transactional email to a known address.
   * Used by internal services (e.g. Identity Service for invitation emails)
   * where a userId does not yet exist.
   * Body: { to: string, subject: string, textBody: string }
   */
  @Post('email')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendDirectEmail(
    @Body('to')       to:       string,
    @Body('subject')  subject:  string,
    @Body('textBody') textBody: string,
  ) {
    if (!to || !subject || !textBody) {
      throw new BadRequestException('to, subject, and textBody are required');
    }
    await this.notificationService.sendDirectEmail(to, subject, textBody);
    return { sent: true };
  }
}
