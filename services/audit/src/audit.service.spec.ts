// ============================================================
// VoteCapsule — Audit Service Unit Tests
// services/audit/src/audit.service.spec.ts
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AccessLog } from './entities/access-log.entity';
import { ComplianceReport } from './entities/compliance-report.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepo: any;
  let accessLogRepo: any;
  let complianceReportRepo: any;

  beforeEach(async () => {
    auditLogRepo = {
      create: jest.fn((dto) => ({ id: 'log-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'log-1', createdAt: new Date(), ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    accessLogRepo = {
      create: jest.fn((dto) => ({ id: 'access-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'access-1', ...entity })),
    };

    complianceReportRepo = {
      create: jest.fn((dto) => ({ id: 'report-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'report-1', createdAt: new Date(), ...entity })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: getRepositoryToken(AccessLog), useValue: accessLogRepo },
        { provide: getRepositoryToken(ComplianceReport), useValue: complianceReportRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('createLog', () => {
    it('should create and return an audit log entry', async () => {
      const dto = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'CAPSULE_CREATED',
        resourceType: 'evidence_capsule',
        resourceId: 'capsule-1',
        serviceName: 'evidence-service',
      };

      const result = await service.createLog(dto as any);

      expect(auditLogRepo.create).toHaveBeenCalledWith(dto);
      expect(auditLogRepo.save).toHaveBeenCalled();
      expect(result.action).toBe('CAPSULE_CREATED');
    });
  });

  describe('findLogs', () => {
    it('should return paginated audit logs', async () => {
      const result = await service.findLogs({ page: 1, limit: 10 } as any);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toEqual([]);
    });

    it('should filter by tenantId and action', async () => {
      await service.findLogs({
        tenantId: 'tenant-1',
        action: 'LOGIN',
        page: 1,
        limit: 20,
      } as any);

      const qb = auditLogRepo.createQueryBuilder();
      expect(auditLogRepo.createQueryBuilder).toHaveBeenCalledWith('log');
    });
  });

  describe('getLogById', () => {
    it('should return a log by ID', async () => {
      auditLogRepo.findOne.mockResolvedValue({ id: 'log-1', action: 'LOGIN' });

      const result = await service.getLogById('log-1');
      expect(result.id).toBe('log-1');
    });

    it('should throw NotFoundException for missing log', async () => {
      auditLogRepo.findOne.mockResolvedValue(null);

      await expect(service.getLogById('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createAccessLog', () => {
    it('should create an access log', async () => {
      const dto = { userId: 'user-1', endpoint: '/api/v1/capsules', method: 'GET' };

      const result = await service.createAccessLog(dto as any);

      expect(accessLogRepo.create).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });
  });

  describe('generateComplianceReport', () => {
    it('should create a compliance report', async () => {
      const dto = {
        tenantId: 'tenant-1',
        reportType: 'GDPR_AUDIT',
        periodStart: '2026-01-01',
        periodEnd: '2026-06-30',
      };

      const result = await service.generateComplianceReport(dto as any);

      expect(complianceReportRepo.create).toHaveBeenCalled();
      expect(complianceReportRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
