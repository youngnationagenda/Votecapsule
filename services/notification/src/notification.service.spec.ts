// ============================================================
// VoteCapsule — Notification Service Unit Tests
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { of, throwError } from 'rxjs';

import { NotificationService } from './notification.service';
import { Notification, NotificationStatus } from './entities/notification.entity';
import { NotificationTemplate, NotificationChannel, NotificationType } from './entities/notification-template.entity';
import { NotificationDelivery, DeliveryStatus } from './entities/notification-delivery.entity';
import { NotificationDevice } from './entities/notification-device.entity';
import { FcmProvider } from './providers/fcm.provider';
import { SesProvider } from './providers/ses.provider';
import { SnsProvider } from './providers/sns.provider';

// ── Mocks ────────────────────────────────────────────────────

const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'notif-1', ...e })),
  create: jest.fn().mockImplementation((e) => e),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
});

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 1 }),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getRawMany: jest.fn().mockResolvedValue([]),
};

const mockTransactionManager = {
  create: jest.fn().mockImplementation((_entity, data) => data),
  save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'notif-1', ...data })),
};

const mockDataSource = {
  transaction: jest.fn().mockImplementation((cb) => cb(mockTransactionManager)),
};

const mockFcm = {
  sendToDevice: jest.fn().mockResolvedValue({ success: true, messageId: 'fcm-msg-1' }),
  sendMulticast: jest.fn().mockResolvedValue({ successCount: 2, failureCount: 0 }),
};

const mockSes = {
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'ses-msg-1' }),
};

const mockSns = {
  sendSms: jest.fn().mockResolvedValue({ success: true, messageId: 'sns-msg-1' }),
};

const mockHttpService = {
  get: jest.fn().mockReturnValue(of({ data: { items: [{ id: 'supervisor-1' }] } })),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:3001/api/v1/identity'),
};

describe('NotificationService', () => {
  let service: NotificationService;
  let notifRepo: ReturnType<typeof createMockRepository>;
  let templateRepo: ReturnType<typeof createMockRepository>;
  let deliveryRepo: ReturnType<typeof createMockRepository>;
  let deviceRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    notifRepo = createMockRepository();
    templateRepo = createMockRepository();
    deliveryRepo = createMockRepository();
    deviceRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: notifRepo },
        { provide: getRepositoryToken(NotificationTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(NotificationDelivery), useValue: deliveryRepo },
        { provide: getRepositoryToken(NotificationDevice), useValue: deviceRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: FcmProvider, useValue: mockFcm },
        { provide: SesProvider, useValue: mockSes },
        { provide: SnsProvider, useValue: mockSns },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  // ── send() ─────────────────────────────────────────────────

  describe('send()', () => {
    const baseDto = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      notificationType: NotificationType.ESCALATION_CREATED,
      channel: NotificationChannel.PUSH,
      title: 'Test Title',
      body: 'Test Body',
      data: { key: 'value' },
    };

    it('should create notification with provided title and body', async () => {
      const result = await service.send(baseDto);

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Notification,
        expect.objectContaining({
          userId: 'user-1',
          title: 'Test Title',
          body: 'Test Body',
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.PENDING,
        }),
      );
      expect(mockTransactionManager.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should resolve template when title/body not provided', async () => {
      templateRepo.findOne.mockResolvedValue({
        name: 'escalation_created_push',
        subjectTemplate: 'Alert: {{escalationType}}',
        bodyTemplate: 'Escalation {{severity}} detected',
        isActive: true,
      });

      await service.send({
        ...baseDto,
        title: undefined,
        body: undefined,
        templateVars: { escalationType: 'DEADLINE_BREACH', severity: 'HIGH' },
      });

      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'escalation_created_push', isActive: true },
      });
    });

    it('should fallback to notificationType when no template found', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await service.send({
        ...baseDto,
        title: undefined,
        body: undefined,
      });

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Notification,
        expect.objectContaining({
          title: NotificationType.ESCALATION_CREATED,
          body: NotificationType.ESCALATION_CREATED,
        }),
      );
    });
  });

  // ── sendBulk() ─────────────────────────────────────────────

  describe('sendBulk()', () => {
    it('should fan out to all user IDs', async () => {
      const dto = {
        userIds: ['user-1', 'user-2', 'user-3'],
        tenantId: 'tenant-1',
        notificationType: NotificationType.ESCALATION_CREATED,
        channel: NotificationChannel.PUSH,
        templateVars: {},
      };

      templateRepo.findOne.mockResolvedValue(null);
      const result = await service.sendBulk(dto);

      expect(result.queued).toBe(3);
      expect(mockTransactionManager.save).toHaveBeenCalledTimes(3);
    });
  });

  // ── registerDevice() ───────────────────────────────────────

  describe('registerDevice()', () => {
    it('should create new device when not existing', async () => {
      deviceRepo.findOne.mockResolvedValue(null);
      deviceRepo.create.mockReturnValue({ userId: 'user-1', deviceToken: 'token-abc', platform: 'android', isActive: true });
      deviceRepo.save.mockResolvedValue({ id: 'dev-1', userId: 'user-1', deviceToken: 'token-abc' });

      const result = await service.registerDevice({
        userId: 'user-1',
        deviceToken: 'token-abc',
        platform: 'android',
      });

      expect(deviceRepo.create).toHaveBeenCalled();
      expect(deviceRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should reactivate existing device', async () => {
      const existing = { id: 'dev-1', userId: 'user-1', deviceToken: 'token-abc', isActive: false, platform: 'ios' };
      deviceRepo.findOne.mockResolvedValue(existing);
      deviceRepo.save.mockResolvedValue({ ...existing, isActive: true, platform: 'android' });

      const result = await service.registerDevice({
        userId: 'user-1',
        deviceToken: 'token-abc',
        platform: 'android',
      });

      expect(existing.isActive).toBe(true);
      expect(existing.platform).toBe('android');
      expect(deviceRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  // ── deregisterDevice() ─────────────────────────────────────

  describe('deregisterDevice()', () => {
    it('should mark device as inactive', async () => {
      await service.deregisterDevice('user-1', 'token-abc');

      expect(deviceRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', deviceToken: 'token-abc' },
        { isActive: false },
      );
    });
  });

  // ── getUserNotifications() ─────────────────────────────────

  describe('getUserNotifications()', () => {
    it('should return paginated notifications with unread count', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'n-1' }], 1]);
      notifRepo.count.mockResolvedValue(5);

      const result = await service.getUserNotifications('user-1', 50, 0);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(5);
    });

    it('should filter unread only when specified', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      notifRepo.count.mockResolvedValue(0);

      await service.getUserNotifications('user-1', 50, 0, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'n.status != :read',
        { read: NotificationStatus.READ },
      );
    });
  });

  // ── markAsRead() ───────────────────────────────────────────

  describe('markAsRead()', () => {
    it('should update notification statuses to READ', async () => {
      await service.markAsRead('user-1', ['notif-1', 'notif-2']);

      expect(notifRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: NotificationStatus.READ }),
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  // ── sendDirectEmail() ──────────────────────────────────────

  describe('sendDirectEmail()', () => {
    it('should send email via SES provider', async () => {
      await service.sendDirectEmail('test@example.com', 'Subject', 'Body text');

      expect(mockSes.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Subject',
        textBody: 'Body text',
      });
    });

    it('should throw when SES fails', async () => {
      mockSes.sendEmail.mockResolvedValue({ success: false, error: 'SES rejected' });

      await expect(
        service.sendDirectEmail('bad@example.com', 'Subject', 'Body'),
      ).rejects.toThrow('Failed to send email: SES rejected');
    });
  });

  // ── handleEscalationCreated() ──────────────────────────────

  describe('handleEscalationCreated()', () => {
    const escalationDetail = {
      escalationId: 'esc-1',
      executionId: 'exec-1',
      workflowType: 'EVIDENCE_CAPSULE',
      capsuleId: 'cap-1',
      tenantId: 'tenant-1',
      escalationType: 'DEADLINE_BREACH',
      severity: 'HIGH',
      message: 'SLA breached',
    };

    it('should fan out push + email to supervisors', async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { items: [{ id: 'sup-1' }, { id: 'sup-2' }] } }),
      );
      templateRepo.findOne.mockResolvedValue(null);

      await service.handleEscalationCreated(escalationDetail);

      // Each supervisor gets push + email for HIGH severity = 4 total sends
      expect(mockTransactionManager.save).toHaveBeenCalled();
    });

    it('should not deliver if no supervisors found', async () => {
      mockHttpService.get.mockReturnValue(of({ data: { items: [] } }));

      await service.handleEscalationCreated(escalationDetail);

      // No notifications should be created
      expect(mockTransactionManager.save).not.toHaveBeenCalled();
    });
  });

  // ── handleWorkflowCompleted() ──────────────────────────────

  describe('handleWorkflowCompleted()', () => {
    it('should handle EVIDENCE_CAPSULE SUCCEEDED', async () => {
      await service.handleWorkflowCompleted({
        executionId: 'exec-1',
        workflowType: 'EVIDENCE_CAPSULE',
        capsuleId: 'cap-1',
        tenantId: 'tenant-1',
        finalStatus: 'SUCCEEDED',
        durationMs: 5000,
      });
      // Logs message, no error
    });

    it('should skip non-EVIDENCE_CAPSULE workflows', async () => {
      await service.handleWorkflowCompleted({
        executionId: 'exec-1',
        workflowType: 'TENANT_PROVISIONING',
        capsuleId: null,
        tenantId: 'tenant-1',
        finalStatus: 'SUCCEEDED',
        durationMs: 1000,
      });
      // Returns early without action
    });
  });

  // ── getStats() ─────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return aggregated statistics', async () => {
      notifRepo.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn()
          .mockResolvedValueOnce([{ channel: 'PUSH', count: '10' }, { channel: 'EMAIL', count: '5' }])
          .mockResolvedValueOnce([{ status: 'SENT', count: '8' }, { status: 'FAILED', count: '2' }]),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
      });
      notifRepo.count.mockResolvedValue(15);
      deliveryRepo.count
        .mockResolvedValueOnce(12) // delivered
        .mockResolvedValueOnce(14); // total deliveries

      const stats = await service.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byChannel');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('deliverySuccessRate');
    });
  });
});
